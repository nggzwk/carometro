#!/usr/bin/env python3
"""
Calculate monthly DIEESE basket values.

This script mirrors `calculate_basket_values.py` but uses a fixed DIEESE
composition (preferred subcategories + fallbacks) and computes the monthly
value using the same normalization and fallback rules as the main basket
calculation.

It will insert/update results into `inflacao_brasil.basket_monthly_value`
for the basket with code `dieese_basket` if that basket exists.
"""

import os
import sys
from decimal import Decimal
from datetime import datetime, timezone

import psycopg

try:
    import _env  # noqa: F401  (run as a script: scripts/ is on sys.path)
except ModuleNotFoundError:
    from backend.scripts import _env  # noqa: F401  (imported as a package, e.g. pytest)


def _parse_pack_size(qtd_embalagem: str) -> Decimal | None:
    try:
        return Decimal(str(qtd_embalagem).replace(",", "."))
    except Exception:
        return None


def _normalize_pack_size(qtd_embalagem: str, unidade_sigla: str, produto_subcategoria: int) -> Decimal | None:
    base_size = _parse_pack_size(qtd_embalagem)
    if base_size is None:
        return None
    unit = (unidade_sigla or "").strip().upper()
    if produto_subcategoria == 30001:
        if unit in ("L", "LITRO"):
            return base_size
        return None
    return base_size


def _get_item_key(conn, item_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla
            FROM inflacao_brasil.item_key
            WHERE id = %s
            """,
            (item_id,),
        )
        return cur.fetchone()


def _get_latest_median_price(conn, item_id: int, month_ref: str) -> Decimal | None:
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
        result = cur.fetchone()
        return Decimal(str(result[0])) if result and result[0] is not None else None


def _get_alternative_item_keys(conn, produto_categoria: int, produto_subcategoria: int, unidade_sigla: str, excluded_item_ids: set[int]):
    with conn.cursor() as cur:
        allowed_units = [unidade_sigla]
        if produto_subcategoria == 30001:
            allowed_units = ["L", "LITRO"]

        excluded_ids = tuple(excluded_item_ids)
        if not excluded_ids:
            excluded_clause = ""
            params = (produto_categoria, produto_subcategoria, *allowed_units)
        else:
            placeholders = ", ".join(["%s"] * len(excluded_ids))
            excluded_clause = f"AND id NOT IN ({placeholders})"
            params = (produto_categoria, produto_subcategoria, *allowed_units, *excluded_ids)

        unit_placeholders = ", ".join(["%s"] * len(allowed_units))

        cur.execute(
            f"""
            SELECT id, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla
            FROM inflacao_brasil.item_key
            WHERE produto_categoria = %s
                AND produto_subcategoria = %s
                AND unidade_sigla IN ({unit_placeholders})
                {excluded_clause}
            ORDER BY CAST(NULLIF(qtd_embalagem, '') AS NUMERIC) DESC, id
            """,
            params,
        )
        return cur.fetchall()


def get_normalized_monthly_price(conn, item_id: int, month_ref: str, fallback_item_id: int | None = None) -> Decimal | None:
    base_item = _get_item_key(conn, item_id)
    if base_item is None:
        return None

    _, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla = base_item
    candidate_items = [base_item]
    candidate_items.extend(
        _get_alternative_item_keys(conn, produto_categoria, produto_subcategoria, unidade_sigla, excluded_item_ids={item_id})
    )

    if fallback_item_id is not None and fallback_item_id != item_id:
        fallback_item = _get_item_key(conn, fallback_item_id)
        if fallback_item is not None:
            _, f_cat, f_subcat, f_qtd, f_unit = fallback_item
            candidate_items.append(fallback_item)
            candidate_items.extend(
                _get_alternative_item_keys(conn, f_cat, f_subcat, f_unit, excluded_item_ids={item_id, fallback_item_id})
            )

    seen_item_ids = set()
    for candidate_item in candidate_items:
        candidate_id, _, candidate_subcategoria, candidate_qtd_embalagem, candidate_unidade = candidate_item
        if candidate_id in seen_item_ids:
            continue
        seen_item_ids.add(candidate_id)

        median_price = _get_latest_median_price(conn, candidate_id, month_ref)
        if median_price is None:
            continue

        pack_size = _normalize_pack_size(candidate_qtd_embalagem, candidate_unidade, candidate_subcategoria)
        if pack_size is None or pack_size <= 0:
            continue

        # return price normalized per base unit (e.g. per kg or per g depending on unidade_sigla)
        return median_price / pack_size

    return None


def _find_item_id_for_subcat(conn, produto_subcategoria: int) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM inflacao_brasil.item_key WHERE produto_subcategoria = %s ORDER BY NULLIF(CAST(REGEXP_REPLACE(qtd_embalagem, '[^0-9,\\.]', '', 'g') AS NUMERIC), 0) DESC NULLS LAST, id LIMIT 1",
            (produto_subcategoria,),
        )
        r = cur.fetchone()
        return int(r[0]) if r else None


def _get_default_basket_item_id(conn, produto_subcategoria: int) -> int | None:
        with conn.cursor() as cur:
                cur.execute(
                        """
                        SELECT ik.id
                        FROM inflacao_brasil.basket_item bi
                        JOIN inflacao_brasil.item_key ik ON bi.item_id = ik.id
                        JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
                        WHERE b.code = %s
                            AND ik.produto_subcategoria = %s
                        ORDER BY ik.id
                        LIMIT 1
                        """,
                        ("default_basket", produto_subcategoria),
                )
                r = cur.fetchone()
                return int(r[0]) if r else None


def _unit_multiplier(dieese_unit: str, item_unit: str) -> Decimal:
    du = (dieese_unit or "").strip().lower()
    iu = (item_unit or "").strip().lower()
    mass_kg = {"kg", "kilo", "kilogram", "kilograms"}
    mass_g = {"g", "gr", "grs", "gram", "grams", "grm"}
    vol_l = {"l", "lt", "litre", "liter", "liters", "litres"}
    vol_ml = {"ml", "milliliter", "millilitre", "milliliters", "millilitres"}

    if du in mass_kg and iu in mass_g:
        return Decimal("1000")
    if du in mass_g and iu in mass_kg:
        return Decimal("0.001")
    if du in vol_l and iu in vol_ml:
        return Decimal("1000")
    if du in vol_ml and iu in vol_l:
        return Decimal("0.001")
    return Decimal("1")


def get_dieese_month_value(conn, month_ref: str) -> dict:
    """Return dict of dieese item values for the month."""
    # DIEESE composition
    dieese_items = [
        ("Carne", 10023, None, Decimal("6.6"), "kg"),
        ("Leite", 30001, None, Decimal("7.5"), "L"),
        ("Feijao", 40012, 40011, Decimal("4.5"), "KG"),
        ("Arroz", 40003, None, Decimal("3.0"), "kg"),
        ("Farinha de trigo", 40017, None, Decimal("1.5"), "kg"),
        ("Batata", 50005, None, Decimal("6.0"), "kg"),
        ("Tomate", 50009, None, Decimal("9.0"), "kg"),
        ("Pão", 90027, None, Decimal("6.0"), "kg"),
        ("Café", 90001, None, Decimal("0.6"), "kg"),
        ("Banana", 50025, 50024, Decimal("6.75"), "kg"),
        ("Açucar", 80002, None, Decimal("3.0"), "kg"),
        ("Óleo de soja", 60001, None, Decimal("0.9"), "L"),
        ("Manteiga", 70012, None, Decimal("0.75"), "kg"),
    ]

    out = []
    for name, primary_subcat, fallback_subcat, qty, unit in dieese_items:
        primary_id = _get_default_basket_item_id(conn, primary_subcat) or _find_item_id_for_subcat(conn, primary_subcat)
        fallback_id = (
            _get_default_basket_item_id(conn, fallback_subcat)
            if fallback_subcat is not None
            else None
        ) or (
            _find_item_id_for_subcat(conn, fallback_subcat) if fallback_subcat else None
        )

        chosen_id = primary_id or fallback_id
        if not chosen_id:
            continue

        # find item unit for conversion
        item_key = _get_item_key(conn, chosen_id)
        item_unit = item_key[4] if item_key and item_key[4] is not None else ""

        # resolve unit-normalized price (price per base unit stored)
        unit_price = get_normalized_monthly_price(conn, primary_id or chosen_id, month_ref, fallback_id)
        if unit_price is None:
            continue

        # convert dieese qty into the item's unit
        multiplier = _unit_multiplier(str(unit), str(item_unit))
        desired_qty_in_item_units = qty * multiplier

        month_price = unit_price * desired_qty_in_item_units

        # previous month
        prev_month = None
        try:
            year, m = month_ref.split("-")
            pm = int(m) - 1
            if pm == 0:
                prev_month = f"{int(year)-1:04d}-12"
            else:
                prev_month = f"{year}-{pm:02d}"
        except Exception:
            prev_month = None

        previous_price = None
        if prev_month:
            prev_unit_price = get_normalized_monthly_price(conn, primary_id or chosen_id, prev_month, fallback_id)
            if prev_unit_price is not None:
                previous_price = prev_unit_price * desired_qty_in_item_units

        mom_pct = None
        if previous_price is not None and previous_price != 0:
            try:
                mom_pct = float(round(((month_price / previous_price) - 1) * 100, 2))
            except Exception:
                mom_pct = None

        # ipca monthly pct
        with conn.cursor() as cur:
            cur.execute("SELECT monthly_inflation_pct FROM inflacao_brasil.ipca_monthly_public WHERE month_ref = %s LIMIT 1", (month_ref,))
            ipca = cur.fetchone()
            ipca_val = float(ipca[0]) if ipca and ipca[0] is not None else None

        out.append(
            {
                "produto_subcategoria": primary_subcat,
                "item_name": name,
                "qtd_basket_dieese": f"{qty}{unit}",
                "month_ref": month_ref,
                "month_price": month_price,
                "previous_price": previous_price,
                "mom_pct": mom_pct,
                "ipca_monthly_pct": ipca_val,
            }
        )

    return out


def calculate_and_store_dieese_values(database_url: str, month_ref: str | None = None) -> None:
    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                # find dieese basket id
                cur.execute("SELECT id FROM inflacao_brasil.basket WHERE code = 'dieese_basket'")
                bres = cur.fetchone()
                basket_id = bres[0] if bres else None

            if month_ref is None:
                with conn.cursor() as cur:
                    cur.execute("SELECT DISTINCT month_ref FROM inflacao_brasil.item_monthly_price ORDER BY month_ref")
                    months = [r[0] for r in cur.fetchall()]
            else:
                months = [month_ref]

            processed = 0
            for month in months:
                rows = get_dieese_month_value(conn, month)
                if not rows:
                    print(f"⊘ {month}: no DIEESE data")
                    continue

                total = Decimal("0")
                for r in rows:
                    total += r["month_price"]

                print(f"✓ {month}: DIEESE total R${total:.2f}")

                if basket_id is not None:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO inflacao_brasil.basket_monthly_value
                                (basket_id, month_ref, basket_value_brl, minimum_wage_brl, percentage_of_wage, calculated_at)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (basket_id, month_ref) DO UPDATE SET
                                basket_value_brl = EXCLUDED.basket_value_brl,
                                minimum_wage_brl = EXCLUDED.minimum_wage_brl,
                                percentage_of_wage = EXCLUDED.percentage_of_wage,
                                calculated_at = EXCLUDED.calculated_at
                            """,
                            (
                                basket_id,
                                month,
                                float(total),
                                None,
                                None,
                                datetime.now(timezone.utc),
                            ),
                        )
                        conn.commit()

                processed += 1

            print(f"Processed: {processed}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable not set", file=sys.stderr)
        sys.exit(1)
    month_arg = sys.argv[1] if len(sys.argv) > 1 else None
    calculate_and_store_dieese_values(db_url, month_arg)
