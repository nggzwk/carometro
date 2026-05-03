#!/usr/bin/env python3
"""Sync monthly IPCA values from the BCB public API into Postgres.

This script keeps only the months from 2026 onward because the frontend will
not use prior years. It can be rerun safely: values are upserted by month.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable
from urllib.request import urlopen

SOURCE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json"
TABLE_NAME = "inflacao_brasil.ipca_monthly_public"
START_MONTH = date(2026, 1, 1)


@dataclass(frozen=True)
class IpcaRow:
    month_ref: date
    monthly_inflation_pct: Decimal
    source_url: str


def _parse_month(value: str) -> date:
    return datetime.strptime(value, "%d/%m/%Y").date().replace(day=1)


def _parse_decimal(value: str) -> Decimal:
    text = (value or "").strip().replace(",", ".")
    if not text:
        raise ValueError("empty IPCA value")
    try:
        return Decimal(text)
    except InvalidOperation as exc:
        raise ValueError(f"invalid IPCA value: {value}") from exc


def _fetch_rows(source_url: str, start_month: date) -> list[IpcaRow]:
    with urlopen(source_url) as response:
        payload = json.load(response)

    rows: list[IpcaRow] = []
    for record in payload:
        month_ref = _parse_month(record["data"])
        if month_ref < start_month:
            continue
        rows.append(
            IpcaRow(
                month_ref=month_ref,
                monthly_inflation_pct=_parse_decimal(record["valor"]),
                source_url=source_url,
            )
        )
    return rows


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return database_url


def _upsert_rows(rows: Iterable[IpcaRow], database_url: str) -> int:
    try:
        psycopg = __import__("psycopg")
    except ModuleNotFoundError as exc:
        raise RuntimeError("Missing dependency: psycopg. Install with: pip install psycopg[binary]") from exc

    rows = list(rows)
    if not rows:
        return 0

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"DELETE FROM {TABLE_NAME} WHERE month_ref < %s",
                (START_MONTH,),
            )
            cursor.executemany(
                f"""
                INSERT INTO {TABLE_NAME} (month_ref, monthly_inflation_pct, source_url)
                VALUES (%s, %s, %s)
                ON CONFLICT (month_ref) DO UPDATE
                SET monthly_inflation_pct = EXCLUDED.monthly_inflation_pct,
                    source_url = EXCLUDED.source_url
                """,
                [(row.month_ref, row.monthly_inflation_pct, row.source_url) for row in rows],
            )
    return len(rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync monthly IPCA values from the BCB API")
    parser.add_argument(
        "--source-url",
        default=SOURCE_URL,
        help="BCB JSON endpoint (default: series 433)",
    )
    parser.add_argument(
        "--start-month",
        default=START_MONTH.isoformat(),
        help="First month to keep in the public table (default: 2026-01-01)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and display rows without writing to the database",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    start_month = datetime.strptime(args.start_month, "%Y-%m-%d").date()

    rows = _fetch_rows(args.source_url, start_month)
    if args.dry_run:
        for row in rows:
            print(f"{row.month_ref.isoformat()} {row.monthly_inflation_pct}")
        print(f"Fetched {len(rows)} month(s)")
        return 0

    written = _upsert_rows(rows, _get_database_url())
    print(f"Synced {written} month(s) into {TABLE_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
