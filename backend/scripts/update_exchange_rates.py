#!/usr/bin/env python3
"""Update cached currency exchange rates for global basket references."""

import json
import os
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import psycopg

DEFAULT_API_URL = "https://openexchangerates.org/api/latest.json"
EXCHANGE_RATE_API_BASE = "https://v6.exchangerate-api.com/v6"
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def _load_env_file() -> None:
    if not ENV_PATH.exists():
        return

    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _replace_api_key_template(base_url: str, api_key: str) -> str | None:
    placeholder = "{API_KEY}"
    if placeholder not in base_url:
        return None
    return base_url.replace(placeholder, api_key)


def _build_api_url() -> str:
    base_url = (os.getenv("EXCHANGE_RATE_API_URL") or DEFAULT_API_URL).strip()
    api_key = (os.getenv("EXCHANGE_RATE_API_KEY") or "").strip()

    if not api_key:
        return base_url

    if base_url == DEFAULT_API_URL:
        return f"{EXCHANGE_RATE_API_BASE}/{api_key}/latest/USD"

    if "exchangerate-api.com" in base_url:
        resolved = _replace_api_key_template(base_url, api_key)
        if resolved:
            return resolved
        return f"{EXCHANGE_RATE_API_BASE}/{api_key}/latest/USD"

    if "app_id=" not in base_url:
        separator = "&" if "?" in base_url else "?"
        return f"{base_url}{separator}{urlencode({'app_id': api_key})}"

    return base_url


def _fetch_rates(api_url: str) -> tuple[str, dict[str, Decimal]]:
    with urlopen(api_url, timeout=15) as response:
        payload = json.load(response)

    base = str(payload.get("base", payload.get("base_code", "USD"))).upper()
    rates_payload = payload.get("rates") or payload.get("conversion_rates") or {}
    rates: dict[str, Decimal] = {}
    for code, value in rates_payload.items():
        rate = _decimal(value)
        if rate is None:
            continue
        rates[str(code).upper()] = rate

    return base, rates


def _get_currency_codes(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT local_currency_code
            FROM inflacao_brasil.global_basket_references
            WHERE local_currency_code IS NOT NULL
            """
        )
        codes = [row[0] for row in cur.fetchall()]

    if "BRL" not in codes:
        codes.append("BRL")

    return [str(code).upper() for code in codes]


def _rate_to_usd(base: str, rates: dict[str, Decimal], code: str) -> Decimal | None:
    if code == "USD":
        return Decimal("1")

    if base == "USD":
        quoted = rates.get(code)
        if quoted is None or quoted == 0:
            return None
        return Decimal("1") / quoted

    base_rate = rates.get("USD")
    code_rate = rates.get(code)
    if base_rate is None or code_rate is None or code_rate == 0:
        return None

    return base_rate / code_rate


def _upsert_rate(conn, currency_code: str, rate_to_usd: Decimal) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO inflacao_brasil.currency_exchange_rates (
                currency_code,
                rate_to_usd,
                updated_at
            )
            VALUES (%s, %s, NOW())
            ON CONFLICT (currency_code)
            DO UPDATE SET
                rate_to_usd = EXCLUDED.rate_to_usd,
                updated_at = EXCLUDED.updated_at
            """,
            (currency_code, rate_to_usd),
        )


def _update_global_basket_usd_values(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE inflacao_brasil.global_basket_references g
            SET
                monthly_min_wage_usd = g.raw_monthly_min_wage * r.rate_to_usd,
                basket_cost_usd = g.raw_basket_cost * r.rate_to_usd,
                last_updated_at = NOW()
            FROM inflacao_brasil.currency_exchange_rates r
            WHERE r.currency_code = g.local_currency_code
            """
        )


def main() -> int:
    _load_env_file()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 1

    api_url = _build_api_url()
    try:
        base, rates = _fetch_rates(api_url)
    except Exception as exc:
        print(f"Failed to fetch rates: {exc}", file=sys.stderr)
        return 1

    if not rates:
        print("No rates returned from API", file=sys.stderr)
        return 1

    updated = 0
    with psycopg.connect(database_url) as conn:
        codes = _get_currency_codes(conn)
        for code in codes:
            rate_to_usd = _rate_to_usd(base, rates, code)
            if rate_to_usd is None:
                print(f"Skipping {code}: missing rate data")
                continue
            _upsert_rate(conn, code, rate_to_usd)
            updated += 1
        _update_global_basket_usd_values(conn)
        conn.commit()

    print(f"Updated {updated} currency rates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
