#!/usr/bin/env python3
"""
Calculate monthly vegetable basket (Feirão) values with minimum wage equivalence.

Items and fallbacks are loaded from vegetable_basket_item table.
Quantity per item is always 1 (KG or PC/UN).
"""

import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

import psycopg

import _env  # noqa: F401  (loads repo-root .env into os.environ on import)


def _load_veggie_items(conn) -> list[tuple[int, int | None, str]]:
    """Return (primary_subcategoria, fallback_subcategoria, unit_sigla) ordered by sort_order."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT primary_subcategoria, fallback_subcategoria, unit_sigla
            FROM inflacao_brasil.vegetable_basket_item
            ORDER BY sort_order
            """
        )
        return cur.fetchall()


def _item_id_for_subcat(conn, subcategoria: int, unit_sigla: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id FROM inflacao_brasil.item_key
            WHERE produto_subcategoria = %s
                AND unidade_sigla = %s
            ORDER BY id
            LIMIT 1
            """,
            (subcategoria, unit_sigla),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def _latest_median_price(conn, item_id: int, month_ref: str) -> Decimal | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT median_price
            FROM inflacao_brasil.item_monthly_price
            WHERE item_id = %s
                AND month_ref <= %s
            ORDER BY month_ref DESC
            LIMIT 1
            """,
            (item_id, month_ref),
        )
        row = cur.fetchone()
    return Decimal(str(row[0])) if row and row[0] is not None else None


def _unit_price(conn, primary_subcat: int, fallback_subcat: int | None, unit: str, month_ref: str) -> Decimal | None:
    """Resolve unit price (per 1 KG or 1 PC/UN) with fallback."""
    primary_id = _item_id_for_subcat(conn, primary_subcat, unit)
    price = _latest_median_price(conn, primary_id, month_ref) if primary_id else None

    if price is None and fallback_subcat is not None:
        fallback_id = _item_id_for_subcat(conn, fallback_subcat, unit)
        price = _latest_median_price(conn, fallback_id, month_ref) if fallback_id else None

    return price


def _minimum_wage(conn, month_ref: str) -> Decimal | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT wage_amount
            FROM inflacao_brasil.minimum_wage_history
            WHERE effective_from = (
                SELECT MAX(effective_from)
                FROM inflacao_brasil.minimum_wage_history
                WHERE effective_from <= (%s || '-01')::DATE
            )
            """,
            (month_ref,),
        )
        row = cur.fetchone()
    return Decimal(str(row[0])) if row and row[0] else None

VEGGIE_MULTIPLIERS: dict[int, Decimal] = {
    50008: Decimal("0.79"),  # Tomate comum
    50025: Decimal("0.9"),   # Banana prata
    50005: Decimal("0.78"),  # Batata inglesa
    50002: Decimal("0.51"),  # Cebola
    50079: Decimal("1.0"),   # Alface (priced per PC/UN, not kg -> qty 1)
    50007: Decimal("0.32"),  # Cenoura
    50021: Decimal("1.86"),   # Laranja pera
    50017: Decimal("0.25"),  # Abobora
    50029: Decimal("0.38"),  # Maca
    50004: Decimal("0.20"),  # Batata doce
}


def _basket_value(conn, items: list[tuple[int, int | None, str]], month_ref: str) -> Decimal | None:
    total = Decimal("0")
    priced = 0
    for primary_subcat, fallback_subcat, unit in items:
        price = _unit_price(conn, primary_subcat, fallback_subcat, unit, month_ref)
        if price is None:
            continue
        multiplier = VEGGIE_MULTIPLIERS.get(primary_subcat, Decimal("1.0"))
        total += price * multiplier
        priced += 1
    return total if priced > 0 else None


def calculate_and_store(database_url: str, month_ref: str | None = None) -> None:
    with psycopg.connect(database_url) as conn:
        items = _load_veggie_items(conn)
        if not items:
            print("No items found in vegetable_basket_item -- aborting")
            return

        print(f"Loaded {len(items)} vegetable basket items")

        with conn.cursor() as cur:
            if month_ref:
                months = [month_ref]
            else:
                cur.execute(
                    "SELECT DISTINCT month_ref FROM inflacao_brasil.item_monthly_price ORDER BY month_ref"
                )
                months = [row[0] for row in cur.fetchall()]

        processed = skipped = 0
        for month in months:
            value = _basket_value(conn, items, month)
            if value is None:
                print(f"o {month}: incomplete data -- skipped")
                skipped += 1
                continue

            wage = _minimum_wage(conn, month)
            pct_of_wage = float((value / wage) * 100) if wage else None

            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO inflacao_brasil.vegetable_basket_monthly_value
                        (month_ref, basket_value_brl, minimum_wage_brl, percentage_of_wage, calculated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (month_ref) DO UPDATE SET
                        basket_value_brl   = EXCLUDED.basket_value_brl,
                        minimum_wage_brl   = EXCLUDED.minimum_wage_brl,
                        percentage_of_wage = EXCLUDED.percentage_of_wage,
                        calculated_at      = EXCLUDED.calculated_at
                    """,
                    (month, float(value), float(wage) if wage else None, pct_of_wage, datetime.now(timezone.utc)),
                )
            conn.commit()

            pct_str = f" ({pct_of_wage:.2f}% of wage)" if pct_of_wage else ""
            print(f"v {month}: R${value:.2f}{pct_str}")
            processed += 1

        print(f"\n{'='*60}")
        print(f"Processed: {processed}, Skipped: {skipped}")
        print("=" * 60)


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    month_arg = sys.argv[1] if len(sys.argv) > 1 else None
    calculate_and_store(db_url, month_arg)
