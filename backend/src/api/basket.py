from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime

from ..database.session import get_db
from ..schemas.basket import (
    BasketItemResponse,
    BasketValueResponse,
    BasketInflationResponse,
    BasketAnnualInflationResponse,
    MonthlyVillains
)

router = APIRouter(prefix="/api/basket", tags=["basket"])


def validate_month_ref(month_ref: str, db: Session) -> None:
    """
    Validate month_ref parameter for basket endpoints.

    Args:
        month_ref: Month in YYYY-MM format to validate
        db: Database session dependency

    Raises:
        HTTPException: 400 if format invalid, 404 if no data exists for the month
    """
    if month_ref is None:
        return

    if len(month_ref) > 7:
        raise HTTPException(
            status_code=400,
            detail="month_ref cannot exceed 7 characters (YYYY-MM format).",
        )
    if len(month_ref) == 0:
        raise HTTPException(status_code=400, detail="month_ref cannot be empty")

    # Check if data exists for this month
    check_query = text("""
        SELECT COUNT(*) FROM inflacao_brasil.item_monthly_price 
        WHERE month_ref = :month_ref
    """)
    count_result = db.execute(check_query, {"month_ref": month_ref}).scalar()
    if count_result == 0:
        raise HTTPException(status_code=404, detail="No data found for the month.")


@router.get("/items", response_model=list[BasketItemResponse])
def get_basket_items(
    month_ref: str | None = Query(
        None,
        max_length=8,
        description="Month in YYYY-MM format. If null, returns latest month available.",
    ),
    db: Session = Depends(get_db),
) -> list[BasketItemResponse]:
    """
    Fetch all items in the default basket with their prices and month-over-month data.

    Args:
        month_ref: Optional month in YYYY-MM format. If not provided, returns latest month data.
        db: Database session dependency.

    Returns:
        List of basket items with pricing information.

    Raises:
        HTTPException: 400 if month_ref is invalid format, 404 if no data exists for the month.
    """
    # Validate month_ref if provided
    validate_month_ref(month_ref, db)

    if month_ref:
        query = text("""
        WITH basket_items AS (
            SELECT item_id FROM inflacao_brasil.basket_item
            WHERE basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
        ),
        item_prices AS (
            SELECT
                ik.id,
                ik.qtd_embalagem,
                ik.unidade_sigla,
                ik.produto_categoria,
                ik.produto_subcategoria,
                imp.median_price,
                imp.month_ref,
                lag(imp.median_price) OVER (PARTITION BY ik.id ORDER BY imp.month_ref) AS prev_price
            FROM inflacao_brasil.item_key ik
            INNER JOIN inflacao_brasil.item_monthly_price imp ON ik.id = imp.item_id
            INNER JOIN basket_items bi ON ik.id = bi.item_id
            WHERE imp.month_ref <= :month_ref
        ),
        latest_prices AS (
            SELECT
                id,
                qtd_embalagem,
                unidade_sigla,
                produto_categoria,
                produto_subcategoria,
                median_price,
                month_ref,
                prev_price,
                row_number() OVER (PARTITION BY id ORDER BY month_ref DESC) AS rn
            FROM item_prices
        )
        SELECT
            lp.produto_categoria,
            lp.produto_subcategoria,
            CASE
                WHEN lp.produto_subcategoria = 10011 THEN 'Filé de peito de frango sem osso'
                WHEN lp.produto_subcategoria = 10023 THEN 'Coxão mole sem osso'
                WHEN lp.produto_subcategoria = 20001 THEN 'Ovos brancos'
                WHEN lp.produto_subcategoria = 30001 THEN 'Leite Integral'
                WHEN lp.produto_subcategoria = 40003 THEN 'Arroz polido'
                WHEN lp.produto_subcategoria = 40012 THEN 'Feijão carioca'
                WHEN lp.produto_subcategoria = 40017 THEN 'Farinha de trigo'
                WHEN lp.produto_subcategoria = 60001 THEN 'Óleo de soja'
                WHEN lp.produto_subcategoria = 80002 THEN 'Açúcar cristal'
                WHEN lp.produto_subcategoria = 90001 THEN 'Café'
                ELSE 'Produto'
            END AS item_name,
            (lp.qtd_embalagem || lp.unidade_sigla) AS qtd_embalagem,
            :month_ref AS month_ref,
            lp.median_price AS month_price,
            lp.prev_price AS previous_price,
            CASE
                WHEN lp.prev_price IS NULL OR lp.prev_price = 0 THEN NULL
                ELSE round(((lp.median_price / lp.prev_price) - 1) * 100, 2)
            END AS mom_pct
        FROM latest_prices lp
        WHERE lp.rn = 1
        ORDER BY lp.produto_categoria, lp.produto_subcategoria
        """)
        result = db.execute(query, {"month_ref": month_ref})
    else:
        query = text("""
        SELECT
            lp.produto_categoria,
            lp.produto_subcategoria,
            CASE
                WHEN lp.produto_subcategoria = 10011 THEN 'Filé de peito de frango sem osso'
                WHEN lp.produto_subcategoria = 10023 THEN 'Coxão mole sem osso'
                WHEN lp.produto_subcategoria = 20001 THEN 'Ovos brancos'
                WHEN lp.produto_subcategoria = 30001 THEN 'Leite Integral'
                WHEN lp.produto_subcategoria = 40003 THEN 'Arroz polido'
                WHEN lp.produto_subcategoria = 40012 THEN 'Feijão carioca'
                WHEN lp.produto_subcategoria = 40017 THEN 'Farinha de trigo'
                WHEN lp.produto_subcategoria = 60001 THEN 'Óleo de soja'
                WHEN lp.produto_subcategoria = 80002 THEN 'Açúcar cristal'
                WHEN lp.produto_subcategoria = 90001 THEN 'Café'
                ELSE 'Produto'
            END AS item_name,
            (lp.qtd_embalagem || lp.unidade_sigla) AS qtd_embalagem,
            lp.month_ref,
            lp.median_price AS month_price,
            lp.prev_price AS previous_price,
            CASE
                WHEN lp.prev_price IS NULL OR lp.prev_price = 0 THEN NULL
                ELSE round(((lp.median_price / lp.prev_price) - 1) * 100, 2)
            END AS mom_pct
        FROM (
            SELECT
                ik.id,
                ik.qtd_embalagem,
                ik.unidade_sigla,
                ik.produto_categoria,
                ik.produto_subcategoria,
                imp.month_ref,
                imp.median_price,
                lag(imp.median_price) OVER (
                    PARTITION BY ik.id
                    ORDER BY imp.month_ref
                ) AS prev_price,
                row_number() OVER (
                    PARTITION BY ik.id
                    ORDER BY imp.month_ref DESC
                ) AS rn
            FROM inflacao_brasil.item_key ik
            INNER JOIN inflacao_brasil.item_monthly_price imp
                ON ik.id = imp.item_id
        ) lp
        INNER JOIN inflacao_brasil.basket_item bi ON lp.id = bi.item_id
        INNER JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
        WHERE b.code = 'default_basket' AND lp.rn = 1
        ORDER BY lp.produto_categoria, lp.produto_subcategoria
        """)
        result = db.execute(query)
    rows = result.fetchall()

    return [
        BasketItemResponse(
            produto_categoria=row[0],
            produto_subcategoria=row[1],
            item_name=row[2],
            qtd_embalagem=row[3],
            month_ref=row[4],
            month_price=row[5],
            previous_price=row[6],
            mom_pct=row[7],
        )
        for row in rows
    ]


@router.get("/value", response_model=list[BasketValueResponse])
def get_basket_values(
    month_ref: str | None = Query(
        None,
        max_length=8,
        description="Month in YYYY-MM format. If null, returns all months."
    ),
    db: Session = Depends(get_db),
) -> list[BasketValueResponse]:
    """
    Fetch pre-calculated basket values with minimum wage equivalence.

    Args:
        month_ref: Optional specific month (YYYY-MM format).
        db: Database session dependency.

    Returns:
        List of basket values with wage percentages.

    Raises:
        HTTPException: 400 if month_ref is invalid format, 404 if no data exists for the month.
    """
    # Validate month_ref if provided
    validate_month_ref(month_ref, db)
    if month_ref:
        query = text("""
            SELECT month_ref, basket_value_brl, minimum_wage_brl, percentage_of_wage
            FROM inflacao_brasil.basket_monthly_value
            WHERE basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            AND month_ref = :month_ref
            ORDER BY month_ref DESC
        """)
        result = db.execute(query, {"month_ref": month_ref})
    else:
        query = text("""
            SELECT month_ref, basket_value_brl, minimum_wage_brl, percentage_of_wage
            FROM inflacao_brasil.basket_monthly_value
            WHERE basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            ORDER BY month_ref DESC
        """)
        result = db.execute(query)

    rows = result.fetchall()
    return [
        BasketValueResponse(
            month_ref=row[0],
            basket_value_brl=row[1],
            minimum_wage_brl=row[2],
            percentage_of_wage=row[3],
        )
        for row in rows
    ]


@router.get("/inflation", response_model=list[BasketInflationResponse])
def get_basket_inflation(
    month_ref: str | None = Query(
        None,
        max_length=8,
        description="Month in YYYY-MM format. If null, returns all months with inflation data.",
    ),
    db: Session = Depends(get_db),
) -> list[BasketInflationResponse]:
    """
    Fetch basket inflation (MoM) comparing current month to previous month.

    Args:
        month_ref: Optional specific month (YYYY-MM format). If not provided, returns all months.
        db: Database session dependency.

    Returns:
        List of basket inflation data with MoM percentage changes and absolute differences.

    Raises:
        HTTPException: 400 if month_ref is invalid format, 404 if no data exists for the month.
    """
    # Validate month_ref if provided
    validate_month_ref(month_ref, db)

    if month_ref:
        # Get current month and previous month separately
        query = text("""
            WITH current_month AS (
                SELECT
                    bmv.month_ref,
                    bmv.basket_value_brl
                FROM inflacao_brasil.basket_monthly_value bmv
                WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
                AND bmv.month_ref = :month_ref
            ),
            previous_month AS (
                SELECT
                    bmv.basket_value_brl AS prev_value
                FROM inflacao_brasil.basket_monthly_value bmv
                WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
                AND bmv.month_ref < :month_ref
                ORDER BY bmv.month_ref DESC
                LIMIT 1
            )
            SELECT
                cm.month_ref,
                cm.basket_value_brl,
                pm.prev_value,
                CASE
                    WHEN pm.prev_value IS NULL
                    THEN NULL
                    ELSE cm.basket_value_brl - pm.prev_value
                END AS basket_difference,
                CASE
                    WHEN pm.prev_value IS NULL OR pm.prev_value = 0
                    THEN NULL
                    ELSE round(((cm.basket_value_brl / pm.prev_value) - 1) * 100, 2)
                END AS inflation_pct
            FROM current_month cm
            LEFT JOIN previous_month pm ON true
        """)
        result = db.execute(query, {"month_ref": month_ref})
    else:
        query = text("""
            SELECT
                bmv.month_ref,
                bmv.basket_value_brl,
                lag(bmv.basket_value_brl) OVER (ORDER BY bmv.month_ref) AS previous_month_value,
                bmv.basket_value_brl - lag(bmv.basket_value_brl) OVER (ORDER BY bmv.month_ref) AS basket_difference,
                CASE
                    WHEN lag(bmv.basket_value_brl) OVER (ORDER BY bmv.month_ref) IS NULL 
                        OR lag(bmv.basket_value_brl) OVER (ORDER BY bmv.month_ref) = 0 
                    THEN NULL
                    ELSE round(((bmv.basket_value_brl / lag(bmv.basket_value_brl) OVER (ORDER BY bmv.month_ref)) - 1) * 100, 2)
                END AS inflation_pct
            FROM inflacao_brasil.basket_monthly_value bmv
            WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            ORDER BY bmv.month_ref DESC
        """)
        result = db.execute(query)

    rows = result.fetchall()
    return [
        BasketInflationResponse(
            month_ref=row[0],
            actual_month_value_brl=row[1],
            previous_month_value_brl=row[2],
            basket_difference_brl=row[3],
            inflation_pct=row[4],
        )
        for row in rows
    ]


@router.get("/villains", response_model=list[MonthlyVillains])
def get_basket_villains(
    year: int | None = Query(
        None,
        description="Year (YYYY) to filter; if omitted returns all months (latest months first).",
        ge=2023,
        le=datetime.now().year,
    ),
    db: Session = Depends(get_db),
):
    """
    Top-3 villain items per month (highest MoM inflation).
    - If `year` provided: return only months in that year.
    - If `year` omitted: return all months, ordered by month_ref DESC (latest first).
    Validates `year` and returns 400 for invalid values, 404 if no data for the year.
    """
    # basic validation
    if year is not None:
        ys = str(year)
        if len(ys) != 4:
            raise HTTPException(
                status_code=400, detail="`year` must be a 4-digit value (YYYY)."
            )

        # ensure there is data for this year
        check_q = text("""
            SELECT COUNT(*) FROM inflacao_brasil.basket_monthly_value bmv
            WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
                AND SUBSTRING(bmv.month_ref, 1, 4) = :year
        """)
        cnt = db.execute(check_q, {"year": ys}).scalar()
        if cnt == 0:
            raise HTTPException(
                status_code=404, detail=f"No data found for year {year}."
            )

    # build optional year filter for months CTE
    year_filter = "AND SUBSTRING(month_ref, 1, 4) = :year" if year is not None else ""

    query_sql = f"""
        WITH months AS (
            SELECT DISTINCT month_ref
            FROM inflacao_brasil.basket_monthly_value bmv
            WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            {year_filter}
            ORDER BY month_ref DESC
        ),
        basket_items AS (
            SELECT ik.id, ik.produto_subcategoria
            FROM inflacao_brasil.item_key ik
            INNER JOIN inflacao_brasil.basket_item bi ON ik.id = bi.item_id
            WHERE bi.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
        ),
        item_months AS (
            SELECT
                m.month_ref,
                bi.id AS item_id,
                bi.produto_subcategoria,
                (
                    SELECT imp.median_price
                    FROM inflacao_brasil.item_monthly_price imp
                    WHERE imp.item_id = bi.id
                        AND imp.month_ref <= m.month_ref
                    ORDER BY imp.month_ref DESC LIMIT 1
                ) AS cur_price,
                (
                    SELECT imp2.median_price
                    FROM inflacao_brasil.item_monthly_price imp2
                    WHERE imp2.item_id = bi.id
                        AND imp2.month_ref < m.month_ref
                    ORDER BY imp2.month_ref DESC LIMIT 1
                ) AS prev_price
            FROM months m
            CROSS JOIN basket_items bi
        ),
        computed AS (
            SELECT
                im.month_ref,
                im.produto_subcategoria,
                CASE
                    WHEN im.produto_subcategoria = 10011 THEN 'Filé de peito de frango sem osso'
                    WHEN im.produto_subcategoria = 10023 THEN 'Coxão mole sem osso'
                    WHEN im.produto_subcategoria = 20001 THEN 'Ovos brancos'
                    WHEN im.produto_subcategoria = 30001 THEN 'Leite Integral'
                    WHEN im.produto_subcategoria = 40003 THEN 'Arroz polido'
                    WHEN im.produto_subcategoria = 40012 THEN 'Feijão carioca'
                    WHEN im.produto_subcategoria = 40017 THEN 'Farinha de trigo'
                    WHEN im.produto_subcategoria = 60001 THEN 'Óleo de soja'
                    WHEN im.produto_subcategoria = 80002 THEN 'Açúcar cristal'
                    WHEN im.produto_subcategoria = 90001 THEN 'Café'
                    ELSE 'Produto'
                END AS item_name,
                im.cur_price AS value,
                ROUND(((im.cur_price / im.prev_price) - 1) * 100, 2) AS inflation
            FROM item_months im
            WHERE im.cur_price IS NOT NULL AND im.prev_price IS NOT NULL
        ),
        ranked AS (
            SELECT
                month_ref, item_name, value, inflation,
                row_number() OVER (PARTITION BY month_ref ORDER BY inflation DESC) AS rn
            FROM computed
        )
        SELECT month_ref, item_name, inflation, value
        FROM ranked
        WHERE rn <= 3
        ORDER BY month_ref DESC, inflation DESC
    """
    query = text(query_sql)
    params = {"year": str(year)} if year is not None else {}
    result = db.execute(query, params)
    rows = result.fetchall()

    # group rows by month_ref and build output
    out = []
    current_month = None
    items = []
    for month_ref, item_name, inflation, value in rows:
        if current_month != month_ref:
            if current_month is not None:
                out.append({"month_ref": current_month, "villains": items})
            current_month = month_ref
            items = []
        items.append(
            {"name": item_name, "inflation": float(inflation), "value": str(value)}
        )
    if current_month is not None:
        out.append({"month_ref": current_month, "villains": items})
    return out


@router.get("/inflation/annual", response_model=list[BasketAnnualInflationResponse])
def get_basket_annual_inflation(
    db: Session = Depends(get_db),
) -> list[BasketAnnualInflationResponse]:
    """
    Fetch annual accumulated basket inflation starting from 2023.

    Uses YEAR-OVER-YEAR comparison:
    - 2024 annual inflation = (Dec 2024 vs Dec 2023)
    - 2025 annual inflation = (Dec 2025 vs Dec 2024)
    - 2026 annual inflation = (Latest 2026 vs Dec 2025)

    Uses fallback logic: if exact month missing, uses latest available from prior months.
    2023 is excluded (no December 2022 data available).

    Returns:
        List of annual YoY inflation data with start/end month values.
    """
    query = text("""
        WITH years AS (
            SELECT 2023 AS year
            UNION ALL
            SELECT 2024
            UNION ALL
            SELECT 2025
            UNION ALL
            SELECT 2026
        ),
        year_end_values AS (
            -- Get last available month for each year
            SELECT
                SUBSTRING(month_ref, 1, 4)::INTEGER AS year,
                month_ref,
                basket_value_brl,
                row_number() OVER (PARTITION BY SUBSTRING(month_ref, 1, 4) ORDER BY month_ref DESC) AS rn
            FROM inflacao_brasil.basket_monthly_value bmv
            WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
        )
        SELECT
            y.year,
            -- Current year end month and value
            cy.month_ref AS end_month_ref,
            cy.basket_value_brl AS end_month_value_brl,
            -- Previous year end month and value (for YoY comparison)
            py.month_ref AS previous_year_end_month_ref,
            py.basket_value_brl AS previous_year_end_value_brl,
            -- Calculate difference (current year - previous year)
            cy.basket_value_brl - py.basket_value_brl AS annual_difference_brl,
            -- Calculate YoY inflation percentage
            CASE
                WHEN py.basket_value_brl IS NULL OR py.basket_value_brl = 0 THEN NULL
                ELSE ROUND(((cy.basket_value_brl - py.basket_value_brl) / py.basket_value_brl) * 100, 2)
            END AS annual_inflation_pct
        FROM years y
        LEFT JOIN year_end_values cy ON cy.year = y.year AND cy.rn = 1
        LEFT JOIN year_end_values py ON py.year = y.year - 1 AND py.rn = 1
        WHERE cy.basket_value_brl IS NOT NULL AND py.basket_value_brl IS NOT NULL
        ORDER BY y.year
    """)

    result = db.execute(query)
    rows = result.fetchall()

    return [
        BasketAnnualInflationResponse(
            year=row[0],
            start_month_ref=row[3],  # Previous year end month
            start_month_value_brl=row[4],  # Previous year end value
            end_month_ref=row[1],  # Current year end month
            end_month_value_brl=row[2],  # Current year end value
            annual_difference_brl=row[5],
            annual_inflation_pct=row[6],
        )
        for row in rows
    ]
