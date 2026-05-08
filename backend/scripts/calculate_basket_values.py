#!/usr/bin/env python3
"""
Calculate monthly basket values with minimum wage equivalence.

Basket composition:
1. Arroz 2.5kg - 2.5x Arroz Polido (produto_subcategoria: 40003)
2. Feijão 1kg - 1x Feijão Carioca (produto_subcategoria: 40012)
3. Farinha 1kg - 1x Farinha de Trigo (produto_subcategoria: 40017)
4. Óleo 900ml - 1x Óleo de Soja (produto_subcategoria: 60001)
5. Café 500g - 1x Café (produto_subcategoria: 90001)
6. Leite 5l - 5x Leite Integral (produto_subcategoria: 30001)
7. Açúcar 1kg - 1x Açúcar Cristal (produto_subcategoria: 80002)
8. Ovos 2dz - 2x Ovos Brancos (produto_subcategoria: 20001)
9. Carne 3kg - 3x Carne (produto_subcategoria: 10023)
10. Frango 4kg - 4x Filé de Frango (produto_subcategoria: 10011)
"""

import os
import sys
from pathlib import Path
from decimal import Decimal
from datetime import datetime

import psycopg

# Basket composition: produto_subcategoria -> quantity
BASKET_COMPOSITION = {
    40003: Decimal("2.5"),    # Arroz Polido (2.5kg)
    40012: Decimal("1"),      # Feijão Carioca (1kg)
    40017: Decimal("1"),      # Farinha de Trigo (1kg)
    60001: Decimal("1"),      # Óleo de Soja (1 bottle)
    90001: Decimal("1"),      # Café (500g)
    30001: Decimal("5"),      # Leite Integral (5L)
    80002: Decimal("1"),      # Açúcar Cristal (1kg)
    20001: Decimal("2"),      # Ovos Brancos (2 dz)
    10023: Decimal("3"),      # Carne/Coxão Mole (3kg)
    10011: Decimal("4"),      # Filé de Frango (4kg)
}


def get_basket_value(conn, month_ref: str) -> Decimal | None:
    """
    Calculate total basket value for a given month using available items.
    
    Args:
        conn: Database connection
        month_ref: Month in YYYY-MM format
    
    Returns:
        Total basket value in BRL or None if no data available
    """
    with conn.cursor() as cur:
        # Get median prices for basket items that have data in this month
        placeholders = ",".join([str(p) for p in BASKET_COMPOSITION.keys()])
        query = f"""
            SELECT
                ik.produto_subcategoria,
                imp.median_price
            FROM inflacao_brasil.item_key ik
            INNER JOIN inflacao_brasil.item_monthly_price imp
                ON ik.id = imp.item_id
                AND imp.month_ref = %s
            WHERE ik.produto_subcategoria IN ({placeholders})
            ORDER BY ik.produto_subcategoria
        """
        
        cur.execute(query, (month_ref,))
        rows = cur.fetchall()
        
        if not rows:
            return None  # No data for this month
        
        # Calculate total value using available items
        total = Decimal("0")
        for subcategoria, median_price in rows:
            quantity = BASKET_COMPOSITION[subcategoria]
            total += Decimal(str(median_price)) * quantity
        
        return total if total > 0 else None


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
            SELECT wage_value
            FROM inflacao_brasil.minimum_wage_history
            WHERE EXTRACT(YEAR FROM effective_date) = %s
            ORDER BY effective_date DESC
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
                # Get default basket ID
                cur.execute(
                    "SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket'"
                )
                basket_result = cur.fetchone()
                if not basket_result:
                    print("✗ Default basket not found")
                    return
                
                basket_id = basket_result[0]
                
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
                    basket_value = get_basket_value(conn, month)
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
                        datetime.utcnow()
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