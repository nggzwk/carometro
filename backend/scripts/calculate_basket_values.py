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


def get_basket_items(conn, basket_code: str = "default_basket") -> list[tuple[int, str, str, Decimal]] | None:
    """
    Load basket composition from database, ensuring exact product sizes.
    
    Returns list of (item_id, qtd_embalagem, unidade_sigla, weight) for basket items.
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
                ik.qtd_embalagem,
                ik.unidade_sigla,
                bi.weight
            FROM inflacao_brasil.basket_item bi
            JOIN inflacao_brasil.item_key ik ON bi.item_id = ik.id
            JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
            WHERE b.code = %s
            ORDER BY ik.id
        """
        cur.execute(query, (basket_code,))
        rows = cur.fetchall()
        return rows if rows else None


def get_basket_value(conn, month_ref: str, basket_items: list[tuple[int, str, str, Decimal]]) -> Decimal | None:
    """
    Calculate total basket value for a given month using available items.
    
    Uses fallback pricing: if an item doesn't have data for the requested month,
    uses the most recent available price from any prior month (month_ref <= requested).
    
    Args:
        conn: Database connection
        month_ref: Month in YYYY-MM format
        basket_items: List of (item_id, qtd_embalagem, unidade_sigla, weight) from get_basket_items()
    
    Returns:
        Total basket value in BRL or None if no data available for any items
    """
    with conn.cursor() as cur:
        # Build item_ids from basket_items for query
        item_ids = [str(item[0]) for item in basket_items]
        item_ids_str = ",".join(item_ids)
        
        # Get prices for all basket items with fallback pricing
        query = f"""
            SELECT
                imp.item_id,
                (
                    SELECT median_price
                    FROM inflacao_brasil.item_monthly_price
                    WHERE item_id = imp.item_id
                    AND month_ref <= %s
                    ORDER BY month_ref DESC
                    LIMIT 1
                ) AS median_price
            FROM inflacao_brasil.item_monthly_price imp
            WHERE imp.item_id IN ({item_ids_str})
            GROUP BY imp.item_id
        """
        
        cur.execute(query, (month_ref,))
        price_rows = cur.fetchall()
        
        if not price_rows:
            return None  # No prices found for any items
        
        # Create price lookup dict: item_id -> median_price
        prices = {row[0]: Decimal(str(row[1])) if row[1] else None for row in price_rows}
        
        # Calculate total value: iterate through basket_items to apply weights
        total = Decimal("0")
        items_with_prices = 0
        
        for item_id, qtd_embalagem, unidade_sigla, weight in basket_items:
            price = prices.get(item_id)
            if price is not None:
                total += price * Decimal(str(weight))
                items_with_prices += 1
        
        # Return total only if at least one item has pricing data
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
                for item_id, qtd_emb, unit, weight in basket_items:
                    print(f"  - Item {item_id}: {qtd_emb}{unit} (weight factor: {weight})")
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