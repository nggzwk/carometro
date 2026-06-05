#!/usr/bin/env python3
"""Exchange rate, USA CPI basket, and Argentina SMVM update pipeline.

Execution order (all weekly):
  1. Exchange rates  — fetch & persist current rates, recalculate basket USD values
  2. USA CPI basket  — fetch BLS CPI for the latest Dieese month and upsert
  3. Argentina SMVM  — fetch SMVM for the latest Dieese month and upsert
"""

import json
import os
import sys
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import psycopg


ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

# Exchange rates
DEFAULT_API_URL = "https://openexchangerates.org/api/latest.json"
EXCHANGE_RATE_API_BASE = "https://v6.exchangerate-api.com/v6"

# BLS — CPI-U Food At Home, seasonally unadjusted (no API key required)
BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
BLS_SERIES_ID = "CUSR0000SAF11"
USA_BASKET_BASELINE_USD = Decimal("280.00")
USA_BASKET_BASELINE_MONTH = "2024-01"

# Argentina SMVM (datos.gob.ar — no API key required)
ARGENTINA_SMVM_API = "https://apis.datos.gob.ar/series/api/series/"
ARGENTINA_SMVM_SERIES = "57.1_SMVMM_0_M_34"

BLS_MONTH_MAP = {
    "M01": "01", "M02": "02", "M03": "03", "M04": "04",
    "M05": "05", "M06": "06", "M07": "07", "M08": "08",
    "M09": "09", "M10": "10", "M11": "11", "M12": "12",
}


def _load_env_file() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _get_latest_dieese_month(conn) -> str | None:
    with conn.cursor() as cur:
        cur.execute("SELECT MAX(month_ref) FROM inflacao_brasil.item_monthly_price")
        row = cur.fetchone()
    return str(row[0]) if row and row[0] else None


def _build_api_url() -> str:
    base_url = (os.getenv("EXCHANGE_RATE_API_URL") or DEFAULT_API_URL).strip()
    api_key = (os.getenv("EXCHANGE_RATE_API_KEY") or "").strip()

    if not api_key:
        return base_url

    if base_url == DEFAULT_API_URL or "exchangerate-api.com" in base_url:
        placeholder = "{API_KEY}"
        if placeholder in base_url:
            return base_url.replace(placeholder, api_key)
        return f"{EXCHANGE_RATE_API_BASE}/{api_key}/latest/USD"

    if "app_id=" not in base_url:
        separator = "&" if "?" in base_url else "?"
        return f"{base_url}{separator}{urlencode({'app_id': api_key})}"

    return base_url


def _fetch_rates(api_url: str) -> tuple[str, dict[str, Decimal]]:
    with urlopen(api_url, timeout=15) as response:
        payload = json.load(response)

    base = str(payload.get("base", payload.get("base_code", "USD"))).upper()
    rates: dict[str, Decimal] = {}
    for code, value in (payload.get("rates") or payload.get("conversion_rates") or {}).items():
        rate = _decimal(value)
        if rate is not None:
            rates[str(code).upper()] = rate

    return base, rates


def _rate_to_usd(base: str, rates: dict[str, Decimal], code: str) -> Decimal | None:
    if code == "USD":
        return Decimal("1")
    if base == "USD":
        quoted = rates.get(code)
        return (Decimal("1") / quoted) if quoted else None
    base_rate, code_rate = rates.get("USD"), rates.get(code)
    if not base_rate or not code_rate:
        return None
    return base_rate / code_rate


def _get_currency_codes(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT local_currency_code
            FROM inflacao_brasil.global_basket_references
            WHERE local_currency_code IS NOT NULL
            """
        )
        codes = [str(row[0]).upper() for row in cur.fetchall()]
    if "BRL" not in codes:
        codes.append("BRL")
    return codes


def _upsert_rate(conn, currency_code: str, rate_to_usd: Decimal) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO inflacao_brasil.currency_exchange_rates (currency_code, rate_to_usd, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (currency_code) DO UPDATE SET
                rate_to_usd = EXCLUDED.rate_to_usd,
                updated_at  = EXCLUDED.updated_at
            """,
            (currency_code, rate_to_usd),
        )
        cur.execute(
            """
            INSERT INTO inflacao_brasil.currency_exchange_rates_history
                (currency_code, rate_to_usd, rate_date, updated_at)
            VALUES (%s, %s, CURRENT_DATE, NOW())
            ON CONFLICT (currency_code, rate_date) DO UPDATE SET
                rate_to_usd = EXCLUDED.rate_to_usd,
                updated_at  = EXCLUDED.updated_at
            """,
            (currency_code, rate_to_usd),
        )


def _update_basket_usd_values(conn) -> None:
    with conn.cursor() as cur:
        # Seed wage reference once — fixed so wage_pct responds to exchange rate movements
        cur.execute(
            """
            UPDATE inflacao_brasil.global_basket_references g
            SET monthly_min_wage_usd = g.raw_monthly_min_wage * r.rate_to_usd
            FROM inflacao_brasil.currency_exchange_rates r
            WHERE r.currency_code = g.local_currency_code
              AND g.monthly_min_wage_usd IS NULL
            """
        )
        cur.execute(
            """
            UPDATE inflacao_brasil.global_basket_references g
            SET
                basket_cost_usd = g.raw_basket_cost * r.rate_to_usd,
                last_updated_at = NOW()
            FROM inflacao_brasil.currency_exchange_rates r
            WHERE r.currency_code = g.local_currency_code
            """
        )


def run_exchange_rates(conn, api_url: str | None = None) -> int:
    resolved_url = api_url or _build_api_url()
    base, rates = _fetch_rates(resolved_url)
    if not rates:
        raise RuntimeError("No rates returned from API")

    codes = _get_currency_codes(conn)
    updated = 0
    for code in codes:
        rate = _rate_to_usd(base, rates, code)
        if rate is None:
            print(f"Exchange rates: skipping {code} — missing rate data")
            continue
        _upsert_rate(conn, code, rate)
        updated += 1

    _update_basket_usd_values(conn)
    print(f"Exchange rates: updated {updated} currencies")
    return updated


def _fetch_bls_cpi() -> dict[str, Decimal]:
    today = date.today()
    payload = json.dumps({
        "seriesid": [BLS_SERIES_ID],
        "startyear": str(today.year - 1),
        "endyear": str(today.year),
    }).encode()

    req = Request(BLS_API_URL, data=payload, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=15) as response:
        data = json.load(response)

    results: dict[str, Decimal] = {}
    for entry in (data.get("Results", {}).get("series") or [{}])[0].get("data", []):
        month = BLS_MONTH_MAP.get(entry.get("period", ""))
        cpi = _decimal(entry.get("value"))
        if month and cpi is not None:
            results[f"{entry['year']}-{month}"] = cpi

    return results


def run_usa_basket_cpi(conn) -> None:
    dieese_month = _get_latest_dieese_month(conn)
    if dieese_month is None:
        print("USA CPI: could not determine latest Dieese month — skipping")
        return

    cpi_by_month = _fetch_bls_cpi()
    if not cpi_by_month:
        print("USA CPI: BLS returned no data — skipping")
        return

    cpi_index = cpi_by_month.get(dieese_month)
    if cpi_index is None:
        print(f"USA CPI: no BLS data for Dieese month {dieese_month} — skipping")
        return

    baseline_cpi = cpi_by_month.get(USA_BASKET_BASELINE_MONTH)
    if baseline_cpi is None:
        baseline_month = min(cpi_by_month)
        baseline_cpi = cpi_by_month[baseline_month]
        print(f"USA CPI: baseline {USA_BASKET_BASELINE_MONTH} not in BLS response, using {baseline_month}")

    basket_usd = (USA_BASKET_BASELINE_USD * cpi_index / baseline_cpi).quantize(Decimal("0.01"))

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO inflacao_brasil.usa_basket_cpi_monthly
                (month_ref, basket_usd, cpi_index, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (month_ref) DO UPDATE SET
                basket_usd = EXCLUDED.basket_usd,
                cpi_index  = EXCLUDED.cpi_index,
                updated_at = EXCLUDED.updated_at
            """,
            (dieese_month, basket_usd, cpi_index),
        )

    print(f"USA CPI: upserted basket ${basket_usd} (CPI {cpi_index}) for {dieese_month}")


def _fetch_argentina_smvm_for_month(month_ref: str) -> Decimal | None:
    url = (
        f"{ARGENTINA_SMVM_API}?ids={ARGENTINA_SMVM_SERIES}"
        f"&start_date={month_ref}-01&end_date={month_ref}-28&format=json"
    )
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=15) as response:
        data = json.load(response)

    rows = data.get("data", [])
    return _decimal(rows[0][1]) if rows else None


def run_argentina_smvm(conn) -> None:
    dieese_month = _get_latest_dieese_month(conn)
    if dieese_month is None:
        print("Argentina SMVM: could not determine latest Dieese month — skipping")
        return

    wage_ars = _fetch_argentina_smvm_for_month(dieese_month)
    if wage_ars is None:
        print(f"Argentina SMVM: no data for {dieese_month} — skipping")
        return

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE inflacao_brasil.global_basket_references g
            SET
                raw_monthly_min_wage = %s,
                monthly_min_wage_usd = %s * r.rate_to_usd,
                last_updated_at      = NOW()
            FROM inflacao_brasil.currency_exchange_rates r
            WHERE g.local_currency_code = 'ARS'
              AND r.currency_code        = 'ARS'
            """,
            (wage_ars, wage_ars),
        )

    print(f"Argentina SMVM: updated ARS {wage_ars:,.0f} for {dieese_month}")


def refresh_all(database_url: str, api_url: str | None = None) -> None:
    with psycopg.connect(database_url) as conn:
        run_exchange_rates(conn, api_url)

        try:
            run_usa_basket_cpi(conn)
        except Exception as exc:
            print(f"Warning: USA CPI update failed: {exc}", file=sys.stderr)

        try:
            run_argentina_smvm(conn)
        except Exception as exc:
            print(f"Warning: Argentina SMVM update failed: {exc}", file=sys.stderr)

        conn.commit()


def main() -> int:
    _load_env_file()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL is not set", file=sys.stderr)
        return 1

    try:
        refresh_all(database_url)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
