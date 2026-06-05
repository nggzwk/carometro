"""Vegetable basket (Feirao) API endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.basket import (
    BasketAnnualInflationResponse,
    BasketInflationResponse,
    BasketItemResponse,
    BasketItemsWithReferenceResponse,
    BasketValueResponse,
    MonthlyVillains,
    VillainItem,
)
from .basket import (
    _get_annual_ipca_pct,
    _get_ipca_monthly_pct,
    _get_item_key_row,
    _previous_month_ref,
    _resolve_unit_price,
    validate_month_ref,
)

router = APIRouter(prefix="/api/vegetable-basket", tags=["vegetable-basket"])

VEGGIE_ITEM_NAMES: dict[int, str] = {
    # Primaries
    50008: "Tomate Comum",
    50025: "Banana Prata",
    50005: "Batata Inglesa",
    50002: "Cebola",
    50079: "Alface Americana",
    50007: "Cenoura",
    50021: "Laranja Pera",
    50017: "Abobora",
    50029: "Maca Gala",
    50004: "Batata Doce",
    # Fallbacks — must be included so the SQL CASE resolves them correctly
    50009: "Tomate Rasteiro",
    50024: "Banana Caturra",
    50080: "Alface Lisa",
    50028: "Maca Fuji",
}

_VEGGIE_NAME_CASE = "CASE " + " ".join(
    f"WHEN {{col}} = {subcat} THEN '{name}'"
    for subcat, name in VEGGIE_ITEM_NAMES.items()
) + " ELSE 'Produto' END"


def _veggie_item_name(subcat: int) -> str:
    return VEGGIE_ITEM_NAMES.get(subcat, "Produto")


def _veggie_name_case_sql(column: str) -> str:
    return _VEGGIE_NAME_CASE.replace("{col}", column)


def _load_veggie_items(db: Session) -> list[tuple[int, int | None, str]]:
    rows = db.execute(
        text(
            """
            SELECT primary_subcategoria, fallback_subcategoria, unit_sigla
            FROM inflacao_brasil.vegetable_basket_item
            ORDER BY sort_order
            """
        )
    ).fetchall()
    return [(int(r[0]), int(r[1]) if r[1] else None, str(r[2])) for r in rows]


def _item_id_for_subcat(db: Session, subcategoria: int, unit_sigla: str) -> int | None:
    row = db.execute(
        text(
            """
            SELECT id FROM inflacao_brasil.item_key
            WHERE produto_subcategoria = :subcat
              AND unidade_sigla = :unit
            ORDER BY id LIMIT 1
            """
        ),
        {"subcat": subcategoria, "unit": unit_sigla},
    ).fetchone()
    return int(row[0]) if row else None


def _build_item_response(
    db: Session,
    primary_subcat: int,
    fallback_subcat: int | None,
    unit_sigla: str,
    month_ref: str,
    prev_month_ref: str,
    ipca: float | None,
) -> BasketItemResponse | None:
    primary_id = _item_id_for_subcat(db, primary_subcat, unit_sigla)
    fallback_id = _item_id_for_subcat(db, fallback_subcat, unit_sigla) if fallback_subcat else None

    unit_price, used_id = (
        _resolve_unit_price(db, primary_id, month_ref, fallback_id)
        if primary_id
        else (None, None)
    )
    if unit_price is None and fallback_id:
        unit_price, used_id = _resolve_unit_price(db, fallback_id, month_ref, None)

    if unit_price is None or used_id is None:
        return None

    item_row = _get_item_key_row(db, used_id)
    if item_row is None:
        return None

    _, produto_categoria, used_subcat, _, _ = item_row
    prev_unit_price, _ = _resolve_unit_price(db, used_id, prev_month_ref, None)

    mom_pct = None
    if prev_unit_price is not None and prev_unit_price != 0:
        mom_pct = round(((unit_price / prev_unit_price) - 1) * 100, 2)

    return BasketItemResponse(
        produto_categoria=produto_categoria,
        produto_subcategoria=used_subcat,
        item_name=_veggie_item_name(used_subcat),
        qtd_embalagem=f"1{unit_sigla}",
        month_ref=month_ref,
        month_price=round(unit_price, 4),
        previous_price=round(prev_unit_price, 4) if prev_unit_price is not None else None,
        mom_pct=mom_pct,
        ipca_monthly_pct=ipca,
    )


@router.get("/items/price", response_model=BasketItemsWithReferenceResponse)
def get_vegetable_basket_items(
    month_ref: str | None = Query(
        None,
        max_length=7,
        description="Month in YYYY-MM format.",
    ),
    db: Session = Depends(get_db),
) -> BasketItemsWithReferenceResponse:
    """
    Fetch all vegetable basket items with prices and MoM data.
    Omit month_ref for latest. Blank / wrong format / no data -> 404.
    Tomate Rasteiro, Banana Caturra, Alface Lisa and Maca Fuji are fallback items if the primary ones are missing prices.
    """
    validate_month_ref(month_ref, db)

    if month_ref is None:
        month_ref = db.execute(
            text("SELECT MAX(month_ref) FROM inflacao_brasil.item_monthly_price")
        ).scalar()

    if not month_ref:
        raise HTTPException(status_code=404, detail="No price data available.")

    prev_month = _previous_month_ref(month_ref)
    ipca = _get_ipca_monthly_pct(db, month_ref)

    items: list[BasketItemResponse] = []
    for primary_subcat, fallback_subcat, unit_sigla in _load_veggie_items(db):
        response = _build_item_response(
            db, primary_subcat, fallback_subcat, unit_sigla,
            month_ref, prev_month, ipca,
        )
        if response is not None:
            items.append(response)

    return BasketItemsWithReferenceResponse(
        basket_items=list(VEGGIE_ITEM_NAMES.values()),
        items=items,
    )


@router.get("/villains", response_model=list[MonthlyVillains])
def get_veggie_villains(
    year: int | None = Query(
        None,
        description="Year (YYYY) to filter.",
        ge=2022,
        le=datetime.now().year,
    ),
    db: Session = Depends(get_db),
) -> list[MonthlyVillains]:
    """Top-3 villain items per month (highest MoM inflation) from the vegetable basket."""
    if year is not None:
        cnt = db.execute(
            text(
                """
                SELECT COUNT(*) FROM inflacao_brasil.vegetable_basket_monthly_value
                WHERE SUBSTRING(month_ref, 1, 4) = :year
                """
            ),
            {"year": str(year)},
        ).scalar()
        if cnt == 0:
            raise HTTPException(status_code=404, detail=f"No data found for year {year}.")

    year_filter = "AND SUBSTRING(month_ref, 1, 4) = :year" if year is not None else ""
    name_case = _veggie_name_case_sql("im.used_subcat")

    query = text(f"""
        WITH months AS (
            SELECT DISTINCT month_ref
            FROM inflacao_brasil.vegetable_basket_monthly_value
            WHERE 1=1 {year_filter}
            ORDER BY month_ref DESC
        ),
        veggie_items AS (
            SELECT
                ik.id            AS item_id,
                ik.produto_subcategoria AS used_subcat,
                vbi.primary_subcategoria,
                vbi.fallback_subcategoria,
                vbi.unit_sigla
            FROM inflacao_brasil.vegetable_basket_item vbi
            JOIN inflacao_brasil.item_key ik
                ON ik.produto_subcategoria = vbi.primary_subcategoria
               AND ik.unidade_sigla = vbi.unit_sigla
            UNION ALL
            SELECT
                ik.id,
                ik.produto_subcategoria,
                vbi.primary_subcategoria,
                vbi.fallback_subcategoria,
                vbi.unit_sigla
            FROM inflacao_brasil.vegetable_basket_item vbi
            JOIN inflacao_brasil.item_key ik
                ON ik.produto_subcategoria = vbi.fallback_subcategoria
               AND ik.unidade_sigla = vbi.unit_sigla
            WHERE vbi.fallback_subcategoria IS NOT NULL
        ),
        item_months AS (
            SELECT
                m.month_ref,
                vi.item_id,
                vi.used_subcat,
                (
                    SELECT imp.median_price
                    FROM inflacao_brasil.item_monthly_price imp
                    WHERE imp.item_id = vi.item_id
                      AND imp.month_ref <= m.month_ref
                    ORDER BY imp.month_ref DESC LIMIT 1
                ) AS cur_price,
                (
                    SELECT imp2.median_price
                    FROM inflacao_brasil.item_monthly_price imp2
                    WHERE imp2.item_id = vi.item_id
                      AND imp2.month_ref < m.month_ref
                    ORDER BY imp2.month_ref DESC LIMIT 1
                ) AS prev_price
            FROM months m
            CROSS JOIN (
                SELECT DISTINCT ON (used_subcat) item_id, used_subcat
                FROM veggie_items
                ORDER BY used_subcat, item_id
            ) vi
        ),
        computed AS (
            SELECT
                im.month_ref,
                im.used_subcat,
                {name_case} AS item_name,
                im.cur_price  AS value,
                ROUND(((im.cur_price / im.prev_price) - 1) * 100, 2) AS inflation
            FROM item_months im
            WHERE im.cur_price IS NOT NULL AND im.prev_price IS NOT NULL AND im.prev_price > 0
        ),
        ranked AS (
            SELECT *,
                ROW_NUMBER() OVER (PARTITION BY month_ref ORDER BY inflation DESC) AS rn
            FROM computed
        )
        SELECT
            r.month_ref,
            r.item_name,
            r.inflation,
            r.value,
            (
                SELECT monthly_inflation_pct
                FROM inflacao_brasil.ipca_monthly_public ip
                WHERE ip.month_ref = r.month_ref LIMIT 1
            ) AS ipca_monthly_pct
        FROM ranked r
        WHERE rn <= 3
        ORDER BY r.month_ref DESC, r.inflation DESC
    """)

    params: dict = {"year": str(year)} if year is not None else {}
    rows = db.execute(query, params).fetchall()

    out: list[MonthlyVillains] = []
    current_month: str | None = None
    villain_items: list[VillainItem] = []
    current_ipca: float | None = None

    for month_ref, item_name, inflation, value, ipca_val in rows:
        if current_month != month_ref:
            if current_month is not None:
                out.append(MonthlyVillains(
                    month_ref=current_month,
                    ipca_monthly_pct=current_ipca,
                    villains=villain_items,
                ))
            current_month = month_ref
            current_ipca = float(ipca_val) if ipca_val is not None else None
            villain_items = []
        villain_items.append(VillainItem(
            name=item_name,
            inflation=float(inflation),
            value=round(float(value), 2),
        ))

    if current_month is not None:
        out.append(MonthlyVillains(
            month_ref=current_month,
            ipca_monthly_pct=current_ipca,
            villains=villain_items,
        ))

    return out


@router.get("/wage", response_model=list[BasketValueResponse])
def get_veggie_wage(
    month_ref: str | None = Query(
        None,
        max_length=7,
        description="Month in YYYY-MM format",
    ),
    db: Session = Depends(get_db),
) -> list[BasketValueResponse]:
    """Vegetable basket value vs minimum wage per month."""
    validate_month_ref(month_ref, db)

    rows = db.execute(
        text(
            """
            SELECT
                v.month_ref,
                v.basket_value_brl,
                mwh.wage_amount AS minimum_wage_brl,
                ROUND((v.basket_value_brl / NULLIF(mwh.wage_amount, 0)) * 100, 2) AS percentage_of_wage
            FROM inflacao_brasil.vegetable_basket_monthly_value v
            LEFT JOIN inflacao_brasil.minimum_wage_history mwh
                ON mwh.effective_from = (
                    SELECT MAX(effective_from)
                    FROM inflacao_brasil.minimum_wage_history
                    WHERE effective_from <= (v.month_ref || '-01')::DATE
                )
            WHERE (:month_ref IS NULL OR v.month_ref = :month_ref)
            ORDER BY v.month_ref DESC
            """
        ),
        {"month_ref": month_ref},
    ).fetchall()

    return [
        BasketValueResponse(
            month_ref=row[0],
            basket_value_brl=round(float(row[1]), 2),
            minimum_wage_brl=row[2],
            percentage_of_wage=row[3],
        )
        for row in rows
    ]


@router.get("/hours")
def get_veggie_hours(
    month_ref: str | None = Query(
        None,
        max_length=7,
        description="Month in YYYY-MM format.",
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Working hours (at minimum wage) needed to buy the vegetable basket."""
    validate_month_ref(month_ref, db)

    rows = db.execute(
        text(
            """
            SELECT
                v.month_ref,
                ROUND(v.basket_value_brl / NULLIF(mwh.wage_amount / 160.0, 0), 2) AS working_hours
            FROM inflacao_brasil.vegetable_basket_monthly_value v
            LEFT JOIN inflacao_brasil.minimum_wage_history mwh
                ON mwh.effective_from = (
                    SELECT MAX(effective_from)
                    FROM inflacao_brasil.minimum_wage_history
                    WHERE effective_from <= (v.month_ref || '-01')::DATE
                )
            WHERE (:month_ref IS NULL OR v.month_ref = :month_ref)
            ORDER BY v.month_ref DESC
            """
        ),
        {"month_ref": month_ref},
    ).fetchall()

    return [{"month_ref": row[0], "working_hours": row[1]} for row in rows]


@router.get("/inflation/month", response_model=list[BasketInflationResponse])
def get_veggie_inflation_month(
    month_ref: str | None = Query(
        None,
        max_length=7,
        description="Month in YYYY-MM format.",
    ),
    db: Session = Depends(get_db),
) -> list[BasketInflationResponse]:
    """Month-over-month inflation for the vegetable basket."""
    validate_month_ref(month_ref, db)

    if month_ref:
        rows = db.execute(
            text(
                """
                WITH cur AS (
                    SELECT month_ref, basket_value_brl
                    FROM inflacao_brasil.vegetable_basket_monthly_value
                    WHERE month_ref = :month_ref
                ),
                prev AS (
                    SELECT basket_value_brl AS prev_value
                    FROM inflacao_brasil.vegetable_basket_monthly_value
                    WHERE month_ref < :month_ref
                    ORDER BY month_ref DESC LIMIT 1
                )
                SELECT
                    cur.month_ref,
                    cur.basket_value_brl,
                    prev.prev_value,
                    cur.basket_value_brl - prev.prev_value AS basket_difference,
                    CASE
                        WHEN prev.prev_value IS NULL OR prev.prev_value = 0 THEN NULL
                        ELSE ROUND(((cur.basket_value_brl / prev.prev_value) - 1) * 100, 2)
                    END AS inflation_pct
                FROM cur
                LEFT JOIN prev ON true
                """
            ),
            {"month_ref": month_ref},
        ).fetchall()
    else:
        rows = db.execute(
            text(
                """
                SELECT
                    month_ref,
                    basket_value_brl,
                    LAG(basket_value_brl) OVER (ORDER BY month_ref) AS prev_value,
                    basket_value_brl - LAG(basket_value_brl) OVER (ORDER BY month_ref) AS basket_difference,
                    CASE
                        WHEN LAG(basket_value_brl) OVER (ORDER BY month_ref) IS NULL
                          OR LAG(basket_value_brl) OVER (ORDER BY month_ref) = 0 THEN NULL
                        ELSE ROUND(
                            ((basket_value_brl / LAG(basket_value_brl) OVER (ORDER BY month_ref)) - 1) * 100, 2
                        )
                    END AS inflation_pct
                FROM inflacao_brasil.vegetable_basket_monthly_value
                ORDER BY month_ref DESC
                """
            )
        ).fetchall()

    return [
        BasketInflationResponse(
            month_ref=row[0],
            actual_month_value_brl=round(float(row[1]), 2),
            previous_month_value_brl=round(float(row[2]), 2) if row[2] is not None else None,
            basket_difference_brl=round(float(row[3]), 2) if row[3] is not None else None,
            inflation_pct=row[4],
            ipca_monthly_pct=_get_ipca_monthly_pct(db, row[0]),
            annual_ipca_pct=_get_annual_ipca_pct(db, row[0]),
        )
        for row in rows
    ]


@router.get("/inflation/annual", response_model=list[BasketAnnualInflationResponse])
def get_veggie_inflation_annual(
    db: Session = Depends(get_db),
) -> list[BasketAnnualInflationResponse]:
    """
    Annual inflation for the vegetable basket.
    Completed years: Dec vs prev Dec. Current year (no Dec yet): latest month vs Jan (YTD).
    """
    rows = db.execute(
        text(
            """
            WITH years AS (
                SELECT DISTINCT SUBSTRING(month_ref, 1, 4)::INT AS year
                FROM inflacao_brasil.vegetable_basket_monthly_value
                WHERE SUBSTRING(month_ref, 1, 4)::INT >= 2022
            ),
            year_end AS (
                SELECT
                    SUBSTRING(month_ref, 1, 4)::INT AS year,
                    month_ref,
                    basket_value_brl,
                    ROW_NUMBER() OVER (PARTITION BY SUBSTRING(month_ref, 1, 4) ORDER BY month_ref DESC) AS rn
                FROM inflacao_brasil.vegetable_basket_monthly_value
            ),
            january AS (
                SELECT
                    SUBSTRING(month_ref, 1, 4)::INT AS year,
                    month_ref,
                    basket_value_brl,
                    ROW_NUMBER() OVER (PARTITION BY SUBSTRING(month_ref, 1, 4) ORDER BY month_ref ASC) AS rn
                FROM inflacao_brasil.vegetable_basket_monthly_value
                WHERE RIGHT(month_ref, 2) = '01'
            ),
            prev_december AS (
                SELECT
                    (SUBSTRING(month_ref, 1, 4)::INT + 1) AS target_year,
                    month_ref,
                    basket_value_brl
                FROM inflacao_brasil.vegetable_basket_monthly_value
                WHERE RIGHT(month_ref, 2) = '12'
            )
            SELECT
                y.year,
                cy.month_ref  AS end_month_ref,
                cy.basket_value_brl AS end_value,
                CASE
                    WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                         AND RIGHT(cy.month_ref, 2) <> '12'
                    THEN jy.month_ref
                    ELSE pd.month_ref
                END AS start_month_ref,
                CASE
                    WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                         AND RIGHT(cy.month_ref, 2) <> '12'
                    THEN jy.basket_value_brl
                    ELSE pd.basket_value_brl
                END AS start_value,
                cy.basket_value_brl - CASE
                    WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                         AND RIGHT(cy.month_ref, 2) <> '12'
                    THEN jy.basket_value_brl
                    ELSE pd.basket_value_brl
                END AS annual_difference,
                ROUND(
                    (cy.basket_value_brl - CASE
                        WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                             AND RIGHT(cy.month_ref, 2) <> '12'
                        THEN jy.basket_value_brl
                        ELSE pd.basket_value_brl
                    END) /
                    NULLIF(CASE
                        WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                             AND RIGHT(cy.month_ref, 2) <> '12'
                        THEN jy.basket_value_brl
                        ELSE pd.basket_value_brl
                    END, 0) * 100, 2
                ) AS annual_pct
            FROM years y
            INNER JOIN year_end cy ON cy.year = y.year AND cy.rn = 1
            LEFT JOIN prev_december pd ON pd.target_year = y.year
            LEFT JOIN january jy ON jy.year = y.year AND jy.rn = 1
            WHERE CASE
                WHEN y.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
                     AND RIGHT(cy.month_ref, 2) <> '12'
                THEN jy.basket_value_brl
                ELSE pd.basket_value_brl
            END IS NOT NULL
            ORDER BY y.year
            """
        )
    ).fetchall()

    return [
        BasketAnnualInflationResponse(
            year=row[0],
            end_month_ref=row[1],
            end_month_value_brl=round(float(row[2]), 2),
            start_month_ref=row[3],
            start_month_value_brl=round(float(row[4]), 2),
            annual_difference_brl=round(float(row[5]), 2),
            annual_inflation_pct=row[6],
            annual_ipca_pct=_get_annual_ipca_pct(db, row[1]),
        )
        for row in rows
    ]
