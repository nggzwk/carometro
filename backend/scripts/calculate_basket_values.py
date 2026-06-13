#!/usr/bin/env python3
"""
Calculate monthly basket values with minimum wage equivalence.

Basket composition is loaded from database (basket_item table) to guarantee
use of correct product sizes and quantities. This ensures:
- No hardcoded product sizes (preventing Arroz 5kg vs 1kg confusion)
- Exact synchronization with database configuration
- Validation via produto_subcategoria + qtd_embalagem + unidade_sigla
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


def _normalize_pack_size(
    qtd_embalagem: str,
    unidade_sigla: str,
    produto_subcategoria: int,
) -> Decimal | None:
    base_size = _parse_pack_size(qtd_embalagem)
    if base_size is None:
        return None

    unit = (unidade_sigla or "").strip().upper()
    if produto_subcategoria == 30001:
        if unit in ("L", "LITRO"):
            return base_size
        return None

    return base_size


def get_basket_items(
    conn, basket_code: str = "default_basket"
) -> list[tuple[int, int, int, str, str, Decimal, int | None]] | None:
    """
    Load basket composition from database, ensuring exact product sizes.
    
    Returns list of (item_id, produto_categoria, produto_subcategoria, qtd_embalagem,
    unidade_sigla, weight, fallback_item_id) for basket items.
    This guarantees correct product identification: produto_subcategoria is NOT unique,
    but (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) is unique.
    
    Args:
        conn: Database connection
        basket_code: Basket identifier (default: 'default_basket')
    
    Returns:
        List of (item_id, qtd_embalagem, unidade_sigla, weight) or None if basket not found
    """
    with conn.cursor() as cur:
        query = """
            SELECT
                ik.id,
                ik.produto_categoria,
                ik.produto_subcategoria,
                ik.qtd_embalagem,
                ik.unidade_sigla,
                bi.weight,
                fallback_ik.id AS fallback_item_id
            FROM inflacao_brasil.basket_item bi
            JOIN inflacao_brasil.item_key ik ON bi.item_id = ik.id
            JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
            LEFT JOIN inflacao_brasil.item_key fallback_ik
                ON fallback_ik.produto_categoria = ik.produto_categoria
                AND fallback_ik.qtd_embalagem = ik.qtd_embalagem
                AND fallback_ik.unidade_sigla = ik.unidade_sigla
                AND ik.produto_subcategoria = 40012
                AND fallback_ik.produto_subcategoria = 40011
            WHERE b.code = %s
            ORDER BY ik.id
        """
        cur.execute(query, (basket_code,))
        rows = cur.fetchall()
        return rows if rows else None


def _get_item_key(conn, item_id: int) -> tuple[int, int, int, str, str] | None:
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


def _get_alternative_item_keys(
    conn,
    produto_categoria: int,
    produto_subcategoria: int,
    unidade_sigla: str,
    excluded_item_ids: set[int],
) -> list[tuple[int, int, int, str, str]]:
    with conn.cursor() as cur:
        allowed_units = [unidade_sigla]
        if produto_subcategoria == 30001:
            allowed_units = ["L", "LITRO"]

        excluded_ids = tuple(excluded_item_ids)
        if not excluded_ids:
            excluded_clause = ""
            params: tuple[object, ...] = (produto_categoria, produto_subcategoria, *allowed_units)
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


def get_normalized_monthly_price(
    conn,
    item_id: int,
    month_ref: str,
    fallback_item_id: int | None = None,
) -> Decimal | None:
    """Return a unit-normalized price for the item, with reusable fallback rules."""
    base_item = _get_item_key(conn, item_id)
    if base_item is None:
        return None

    _, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla = base_item
    candidate_items: list[tuple[int, int, int, str, str]] = [base_item]
    candidate_items.extend(
        _get_alternative_item_keys(
            conn,
            produto_categoria,
            produto_subcategoria,
            unidade_sigla,
            excluded_item_ids={item_id},
        )
    )

    if fallback_item_id is not None and fallback_item_id != item_id:
        fallback_item = _get_item_key(conn, fallback_item_id)
        if fallback_item is not None:
            _, fallback_categoria, fallback_subcategoria, fallback_qtd, fallback_unidade = fallback_item
            candidate_items.append(fallback_item)
            candidate_items.extend(
                _get_alternative_item_keys(
                    conn,
                    fallback_categoria,
                    fallback_subcategoria,
                    fallback_unidade,
                    excluded_item_ids={item_id, fallback_item_id},
                )
            )

    seen_item_ids: set[int] = set()
    for candidate_item in candidate_items:
        candidate_id, _, candidate_subcategoria, candidate_qtd_embalagem, candidate_unidade = candidate_item
        if candidate_id in seen_item_ids:
            continue
        seen_item_ids.add(candidate_id)

        median_price = _get_latest_median_price(conn, candidate_id, month_ref)
        if median_price is None:
            continue

        pack_size = _normalize_pack_size(
            candidate_qtd_embalagem,
            candidate_unidade,
            candidate_subcategoria,
        )
        if pack_size is None or pack_size <= 0:
            continue

        return median_price / pack_size

    return None


BASKET_MULTIPLIERS = {
    40003: Decimal("2.81"),  # Arroz
    30001: Decimal("6.19"),  # Leite
    20001: Decimal("43.0"),  # Ovos
    10023: Decimal("2.81"),  # Carne
    10011: Decimal("3.57"),  # Frango
    40012: Decimal("1.23"),  # Feijão
    40017: Decimal("0.92"),  # Farinha
    80002: Decimal("1.4"),   # Açúcar
}

def get_basket_value(
    conn,
    month_ref: str,
    basket_items: list[tuple[int, int, int, str, str, Decimal, int | None]],
) -> Decimal | None:
    """
    Calculate total basket value for a given month using available items.
    
    Uses fallback pricing: if an item doesn't have data for the requested month,
    uses the most recent available price from any prior month (month_ref <= requested).
    
    Args:
        conn: Database connection
        month_ref: Month in YYYY-MM format
        basket_items: List of (item_id, produto_categoria, produto_subcategoria,
        qtd_embalagem, unidade_sigla, weight, fallback_item_id) from get_basket_items()
    
    Returns:
        Total basket value in BRL or None if no data available for any items
    """
    total = Decimal("0")
    items_with_prices = 0

    for item_id, _, subcat, _, _, _, fallback_item_id in basket_items:
        price = get_normalized_monthly_price(conn, item_id, month_ref, fallback_item_id)
        if price is None:
            continue

        multiplier = BASKET_MULTIPLIERS.get(subcat, Decimal("1.0"))
        
        total += price * multiplier
        items_with_prices += 1

    return total if items_with_prices > 0 else None

def get_minimum_wage_for_month(conn, month_ref: str) -> Decimal | None:
    """
    Get minimum wage for the year of the given month.
    
    Args:
        conn: Database connection
        month_ref: Month in YYYY-MM format
    
    Returns:
        Minimum wage value or None if not found
    """
    with conn.cursor() as cur:
        year = month_ref[:4]
        query = """
            SELECT wage_amount
            FROM inflacao_brasil.minimum_wage_history
            WHERE EXTRACT(YEAR FROM effective_from) = %s
            ORDER BY effective_from DESC
            LIMIT 1
        """
        cur.execute(query, (int(year),))
        result = cur.fetchone()
        return Decimal(str(result[0])) if result else None


def calculate_and_store_basket_values(database_url: str, month_ref: str | None = None) -> None:
    """
    Calculate basket values for specified month(s) and store in database.
    
    Args:
        database_url: PostgreSQL connection string
        month_ref: Specific month (YYYY-MM) or None to process all available months
    """
    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                # Get default basket ID and load basket composition
                cur.execute(
                    "SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket'"
                )
                basket_result = cur.fetchone()
                if not basket_result:
                    print("✗ Default basket not found")
                    return
                
                basket_id = basket_result[0]
                
                # Load basket items from database (guarantees exact product sizes)
                basket_items = get_basket_items(conn, "default_basket")
                if not basket_items:
                    print("✗ No items configured in default basket")
                    return
                
                print(f"Loaded {len(basket_items)} items from basket_item table:")
                for item_id, produto_categoria, produto_subcategoria, qtd_emb, unit, weight, fallback_item_id in basket_items:
                    fallback_note = f", fallback item {fallback_item_id}" if fallback_item_id else ""
                    print(
                        f"  - Item {item_id} [{produto_categoria}/{produto_subcategoria}]: "
                        f"{qtd_emb}{unit} (weight factor: {weight}{fallback_note})"
                    )
                print()
                
                # Determine months to process
                if month_ref:
                    months_to_process = [month_ref]
                else:
                    # Get all months with data
                    cur.execute(
                        "SELECT DISTINCT month_ref FROM inflacao_brasil.item_monthly_price ORDER BY month_ref"
                    )
                    months_to_process = [row[0] for row in cur.fetchall()]
                
                processed = 0
                skipped = 0
                
                for month in months_to_process:
                    basket_value = get_basket_value(conn, month, basket_items)
                    if basket_value is None:
                        print(f"⊘ {month}: Incomplete data (skipped)")
                        skipped += 1
                        continue
                    
                    minimum_wage = get_minimum_wage_for_month(conn, month)
                    percentage_of_wage = None
                    if minimum_wage and minimum_wage > 0:
                        percentage_of_wage = float((basket_value / minimum_wage) * 100)
                    
                    # Insert or update basket value
                    cur.execute("""
                        INSERT INTO inflacao_brasil.basket_monthly_value
                            (basket_id, month_ref, basket_value_brl, minimum_wage_brl, percentage_of_wage, calculated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (basket_id, month_ref) DO UPDATE SET
                            basket_value_brl = EXCLUDED.basket_value_brl,
                            minimum_wage_brl = EXCLUDED.minimum_wage_brl,
                            percentage_of_wage = EXCLUDED.percentage_of_wage,
                            calculated_at = EXCLUDED.calculated_at
                    """, (
                        basket_id,
                        month,
                        float(basket_value),
                        float(minimum_wage) if minimum_wage else None,
                        percentage_of_wage,
                        datetime.now(timezone.utc)
                    ))
                    conn.commit()
                    print(f"✓ {month}: R${basket_value:.2f}" + (f" ({percentage_of_wage:.2f}% of wage)" if percentage_of_wage else ""))
                    processed += 1
                
                print(f"\n{'='*60}")
                print(f"Processed: {processed}, Skipped: {skipped}")
                print('='*60)
        
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    month_arg = sys.argv[1] if len(sys.argv) > 1 else None
    calculate_and_store_basket_values(db_url, month_arg)