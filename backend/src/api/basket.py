from functools import lru_cache
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
from urllib.request import urlopen

from ..database.session import get_db
from ..schemas.basket import (
    BasketItemResponse,
    BasketValueResponse,
    BasketInflationResponse,
    BasketAnnualInflationResponse,
    MonthlyVillains,
    BasketItemsWithReferenceResponse,
)

router = APIRouter(prefix="/api/basket", tags=["basket"])

SIDRA_ANNUAL_IPCA_URL = (
    "https://apisidra.ibge.gov.br/values/t/1737/p/all/v/69/n1/all?formato=json"
)


@lru_cache(maxsize=1)
def _load_sidra_annual_ipca() -> dict[str, float]:
    """Load accumulated annual IPCA values from SIDRA and cache them in memory."""
    try:
        with urlopen(SIDRA_ANNUAL_IPCA_URL, timeout=10) as response:
            payload = json.load(response)
    except Exception:
        return {}

    annual_values: dict[str, float] = {}
    for row in payload[1:]:
        month_code = row.get("D1C")
        value = row.get("V")
        if not month_code or value in (None, "..."):
            continue

        try:
            annual_values[str(month_code)] = float(value)
        except (TypeError, ValueError):
            continue

    return annual_values


def _get_annual_ipca_pct(db: Session, month_ref: str) -> float | None:
    """Return the official IPCA value for a month, using SIDRA for 2026+."""
    year = int(month_ref[:4])
    if year >= 2026:
        sidra_value = _load_sidra_annual_ipca().get(month_ref.replace("-", ""))
        if sidra_value is not None:
            return sidra_value

    query = text("""
        SELECT annual_inflation_pct
        FROM inflacao_brasil.ipca_monthly
        WHERE EXTRACT(YEAR FROM effective_date) = :year
        ORDER BY effective_date DESC
        LIMIT 1
    """)
    return db.execute(query, {"year": year}).scalar()


def _previous_month_ref(month_ref: str) -> str:
    parsed_month = datetime.strptime(month_ref, "%Y-%m")
    if parsed_month.month == 1:
        return f"{parsed_month.year - 1:04d}-12"
    return f"{parsed_month.year:04d}-{parsed_month.month - 1:02d}"


def _parse_pack_size(qtd_embalagem: str) -> float | None:
    try:
        return float(str(qtd_embalagem).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _get_item_key_row(db: Session, item_id: int):
    query = text("""
        SELECT id, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla
        FROM inflacao_brasil.item_key
        WHERE id = :item_id
    """)
    return db.execute(query, {"item_id": item_id}).fetchone()


def _get_item_monthly_median_price(
    db: Session, item_id: int, month_ref: str
) -> float | None:
    query = text("""
        SELECT median_price
        FROM inflacao_brasil.item_monthly_price
        WHERE item_id = :item_id
          AND month_ref <= :month_ref
        ORDER BY month_ref DESC
        LIMIT 1
    """)
    result = db.execute(query, {"item_id": item_id, "month_ref": month_ref}).scalar()
    return float(result) if result is not None else None


def _get_alternative_item_keys(
    db: Session,
    produto_categoria: int,
    produto_subcategoria: int,
    unidade_sigla: str,
    excluded_item_ids: set[int],
) -> list[tuple[int, int, int, str, str]]:
    params: dict[str, object] = {
        "produto_categoria": produto_categoria,
        "produto_subcategoria": produto_subcategoria,
        "unidade_sigla": unidade_sigla,
    }
    excluded_clause = ""
    if excluded_item_ids:
        placeholders = ", ".join(
            [f":excluded_{index}" for index in range(len(excluded_item_ids))]
        )
        excluded_clause = f"AND id NOT IN ({placeholders})"
        for index, excluded_item_id in enumerate(sorted(excluded_item_ids)):
            params[f"excluded_{index}"] = excluded_item_id

    query = text(f"""
        SELECT id, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla
        FROM inflacao_brasil.item_key
        WHERE produto_categoria = :produto_categoria
            AND produto_subcategoria = :produto_subcategoria
            AND unidade_sigla = :unidade_sigla
            {excluded_clause}
        ORDER BY CAST(NULLIF(qtd_embalagem, '') AS NUMERIC) DESC, id
    """)
    return list(db.execute(query, params).all())


def _resolve_unit_price(
    db: Session,
    item_id: int,
    month_ref: str,
    fallback_item_id: int | None = None,
) -> tuple[float | None, int | None]:
    base_row = _get_item_key_row(db, item_id)
    if base_row is None:
        return None, None

    _, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla = base_row
    candidate_rows: list[tuple[int, int, int, str, str]] = [
        (item_id, produto_categoria, produto_subcategoria, qtd_embalagem, unidade_sigla)
    ]
    candidate_rows.extend(
        _get_alternative_item_keys(
            db,
            produto_categoria,
            produto_subcategoria,
            unidade_sigla,
            excluded_item_ids={item_id},
        )
    )

    if fallback_item_id is not None and fallback_item_id != item_id:
        fallback_row = _get_item_key_row(db, fallback_item_id)
        if fallback_row is not None:
            (
                _,
                fallback_categoria,
                fallback_subcategoria,
                fallback_unidade_sigla,
            ) = fallback_row
            candidate_rows.append(fallback_row)
            candidate_rows.extend(
                _get_alternative_item_keys(
                    db,
                    fallback_categoria,
                    fallback_subcategoria,
                    fallback_unidade_sigla,
                    excluded_item_ids={item_id, fallback_item_id},
                )
            )

    seen_item_ids: set[int] = set()
    for candidate_item_id, _, _, candidate_qtd_embalagem, _ in candidate_rows:
        if candidate_item_id in seen_item_ids:
            continue
        seen_item_ids.add(candidate_item_id)

        median_price = _get_item_monthly_median_price(db, candidate_item_id, month_ref)
        if median_price is None:
            continue

        pack_size = _parse_pack_size(candidate_qtd_embalagem)
        if pack_size is None or pack_size <= 0:
            continue

        return median_price / pack_size, candidate_item_id

    return None, None


def _item_name_from_subcategory(produto_subcategoria: int) -> str:
    return {
        10011: "Filé de peito de frango sem osso",
        10023: "Coxão mole sem osso",
        20001: "Ovos brancos",
        30001: "Leite Integral",
        40003: "Arroz polido",
        40012: "Feijão carioca",
        40017: "Farinha de trigo",
        60001: "Óleo de soja",
        80002: "Açúcar cristal",
        90001: "Café",
    }.get(produto_subcategoria, "Produto")


def _get_ipca_monthly_pct(db: Session, month_ref: str) -> float | None:
    query = text("""
        SELECT monthly_inflation_pct
        FROM inflacao_brasil.ipca_monthly_public
        WHERE month_ref = :month_ref
        LIMIT 1
    """)
    return db.execute(query, {"month_ref": month_ref}).scalar()


def _load_basket_items(
    db: Session,
) -> list[tuple[int, int, int, str, str, float, int | None]]:
    query = text("""
        SELECT
            ik.id,
            ik.produto_categoria,
            ik.produto_subcategoria,
            ik.qtd_embalagem,
            ik.unidade_sigla,
            bi.weight,
            fallback_ik.id AS fallback_item_id
        FROM inflacao_brasil.basket_item bi
        INNER JOIN inflacao_brasil.item_key ik ON bi.item_id = ik.id
        INNER JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
        LEFT JOIN inflacao_brasil.item_key fallback_ik
            ON fallback_ik.produto_categoria = ik.produto_categoria
            AND fallback_ik.qtd_embalagem = ik.qtd_embalagem
            AND fallback_ik.unidade_sigla = ik.unidade_sigla
            AND ik.produto_subcategoria = 40012
            AND fallback_ik.produto_subcategoria = 40011
        WHERE b.code = 'default_basket'
        ORDER BY ik.id
    """)
    return list(db.execute(query).all())


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


@router.get("/items/price", response_model=BasketItemsWithReferenceResponse)
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
        basket_items = _load_basket_items(db)
        previous_month_ref = _previous_month_ref(month_ref)
        month_ipca = _get_ipca_monthly_pct(db, month_ref)

        rows = []
        for (
            item_id,
            produto_categoria,
            produto_subcategoria,
            qtd_embalagem,
            unidade_sigla,
            weight,
            fallback_item_id,
        ) in basket_items:
            unit_normalized_price, _ = _resolve_unit_price(
                db, item_id, month_ref, fallback_item_id
            )
            if unit_normalized_price is None:
                continue

            previous_unit_price, _ = _resolve_unit_price(
                db, item_id, previous_month_ref, fallback_item_id
            )
            
            # Convert unit price back to package price
            pack_size = _parse_pack_size(qtd_embalagem)
            if pack_size is None or pack_size <= 0:
                continue
                
            month_price = unit_normalized_price * pack_size
            previous_price = (previous_unit_price * pack_size) if previous_unit_price is not None else None
            
            mom_pct = None
            if previous_price is not None and previous_price != 0:
                mom_pct = round(((month_price / previous_price) - 1) * 100, 2)

            rows.append(
                (
                    produto_categoria,
                    produto_subcategoria,
                    _item_name_from_subcategory(produto_subcategoria),
                    f"{qtd_embalagem}{unidade_sigla}",
                    month_ref,
                    f"{month_price:.4f}",
                    f"{previous_price:.4f}" if previous_price is not None else None,
                    mom_pct,
                    month_ipca,
                )
            )
    else:
        query = text("""
        WITH basket_items AS (
            SELECT
                ik.id AS item_id,
                ik.qtd_embalagem,
                ik.unidade_sigla,
                ik.produto_categoria,
                ik.produto_subcategoria,
                CASE
                    WHEN ik.produto_subcategoria = 40012 THEN fallback_ik.id
                    ELSE NULL
                END AS fallback_item_id
            FROM inflacao_brasil.basket_item bi
            INNER JOIN inflacao_brasil.item_key ik ON bi.item_id = ik.id
            INNER JOIN inflacao_brasil.basket b ON bi.basket_id = b.id
            LEFT JOIN inflacao_brasil.item_key fallback_ik
                ON fallback_ik.produto_categoria = ik.produto_categoria
                AND fallback_ik.qtd_embalagem = ik.qtd_embalagem
                AND fallback_ik.unidade_sigla = ik.unidade_sigla
                AND fallback_ik.produto_subcategoria = 40011
            WHERE b.code = 'default_basket'
        ),
        price_candidates AS (
            SELECT
                bi.item_id,
                bi.qtd_embalagem,
                bi.unidade_sigla,
                bi.produto_categoria,
                bi.produto_subcategoria,
                imp.month_ref,
                imp.median_price,
                0 AS source_priority
            FROM basket_items bi
            INNER JOIN inflacao_brasil.item_monthly_price imp ON bi.item_id = imp.item_id

            UNION ALL

            SELECT
                bi.item_id,
                bi.qtd_embalagem,
                bi.unidade_sigla,
                bi.produto_categoria,
                bi.produto_subcategoria,
                imp.month_ref,
                imp.median_price,
                1 AS source_priority
            FROM basket_items bi
            INNER JOIN inflacao_brasil.item_monthly_price imp ON bi.fallback_item_id = imp.item_id
            WHERE bi.fallback_item_id IS NOT NULL
        ),
        resolved_prices AS (
            SELECT
                item_id,
                qtd_embalagem,
                unidade_sigla,
                produto_categoria,
                produto_subcategoria,
                month_ref,
                median_price,
                row_number() OVER (
                    PARTITION BY item_id, month_ref
                    ORDER BY source_priority
                ) AS source_rn
            FROM price_candidates
        ),
        item_prices AS (
            SELECT
                item_id,
                qtd_embalagem,
                unidade_sigla,
                produto_categoria,
                produto_subcategoria,
                month_ref,
                median_price,
                lag(median_price) OVER (
                    PARTITION BY item_id
                    ORDER BY month_ref
                ) AS prev_price
            FROM resolved_prices
            WHERE source_rn = 1
        ),
        latest_prices AS (
            SELECT
                item_id,
                qtd_embalagem,
                unidade_sigla,
                produto_categoria,
                produto_subcategoria,
                median_price,
                month_ref,
                prev_price,
                row_number() OVER (
                    PARTITION BY item_id
                    ORDER BY month_ref DESC
                ) AS rn
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
            lp.month_ref,
            lp.median_price AS month_price,
            lp.prev_price AS previous_price,
            CASE
                WHEN lp.prev_price IS NULL OR lp.prev_price = 0 THEN NULL
                ELSE round(((lp.median_price / lp.prev_price) - 1) * 100, 2)
            END AS mom_pct
            , (SELECT monthly_inflation_pct FROM inflacao_brasil.ipca_monthly_public ip WHERE ip.month_ref = lp.month_ref) AS ipca_monthly_pct
        FROM latest_prices lp
        WHERE lp.rn = 1
        ORDER BY lp.produto_categoria, lp.produto_subcategoria, lp.month_ref
        """)
        result = db.execute(query)
    if not month_ref:
        rows = result.fetchall()

    basket_items_list = [
        "Filé de peito de frango sem osso",
        "Coxão mole sem osso",
        "Ovos brancos",
        "Leite Integral",
        "Arroz polido",
        "Feijão carioca",
        "Farinha de trigo",
        "Óleo de soja",
        "Açúcar cristal",
        "Café",
    ]

    items_response = [
        BasketItemResponse(
            produto_categoria=row[0],
            produto_subcategoria=row[1],
            item_name=row[2],
            qtd_embalagem=row[3],
            month_ref=row[4],
            month_price=round(float(row[5]), 2), # round(float(row[1]), 2)
            previous_price=round(float(row[6]), 2),
            mom_pct=row[7],
            ipca_monthly_pct=row[8],
        )
        for row in rows
    ]

    return BasketItemsWithReferenceResponse(
        basket_items=basket_items_list, items=items_response
    )


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
        SELECT r.month_ref, r.item_name, r.inflation, r.value,
            (
                SELECT monthly_inflation_pct
                FROM inflacao_brasil.ipca_monthly_public ip
                WHERE ip.month_ref = r.month_ref
                LIMIT 1
            ) AS ipca_monthly_pct
        FROM ranked r
        WHERE rn <= 3
        ORDER BY r.month_ref DESC, r.inflation DESC
    """
    query = text(query_sql)
    params = {"year": str(year)} if year is not None else {}
    result = db.execute(query, params)
    rows = result.fetchall()

    # group rows by month_ref and build output
    out = []
    current_month = None
    items = []
    current_ipca = None
    for month_ref, item_name, inflation, value, ipca_val in rows:
        if current_month != month_ref:
            if current_month is not None:
                out.append(
                    {
                        "month_ref": current_month,
                        "ipca_monthly_pct": current_ipca,
                        "villains": items,
                    }
                )
            current_month = month_ref
            current_ipca = ipca_val
            items = []
        items.append(
            {"name": item_name, "inflation": float(inflation), "value": str(value)}
        )
    if current_month is not None:
        out.append(
            {
                "month_ref": current_month,
                "ipca_monthly_pct": current_ipca,
                "villains": items,
            }
        )
    return out


@router.get("/wage", response_model=list[BasketValueResponse])
def get_basket_values(
    month_ref: str | None = Query(
        None,
        max_length=8,
        description="Mês no formato YYYY-MM. Se nulo, retorna todos os meses.",
    ),
    db: Session = Depends(get_db),
) -> list[BasketValueResponse]:
    """
    Calcula o valor da cesta respeitando:
    1. Normalização de preço (Preço / Tamanho da Embalagem).
    2. Fallback de itens (Se subcat 40012 não tem preço, usa 40011).
    3. Multiplicadores de quantidade real (Arroz * 2.5, Leite * 5, etc).
    ** Valor para UMA pessoa.
    """
    validate_month_ref(month_ref, db)

    query_sql = """
        WITH basket_composition AS (
            -- Identifica os itens da cesta e seus respectivos fallbacks (ex: 40012 -> 40011)
            SELECT
                bi.item_id,
                ik.produto_subcategoria,
                ik.qtd_embalagem,
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
            WHERE b.code = 'default_basket'
        ),
        monthly_prices AS (
            -- Obtém o preço normalizado, tentando o item principal e depois o fallback
            SELECT
                bc.produto_subcategoria,
                imp_main.month_ref,
                COALESCE(
                    imp_main.median_price, 
                    imp_fallback.median_price
                ) / CAST(REPLACE(bc.qtd_embalagem, ',', '.') AS NUMERIC) AS unit_price
            FROM basket_composition bc
            -- Join com o preço do item principal
            LEFT JOIN inflacao_brasil.item_monthly_price imp_main 
                ON bc.item_id = imp_main.item_id
            -- Join com o preço do item de fallback (opcional)
            LEFT JOIN inflacao_brasil.item_monthly_price imp_fallback 
                ON bc.fallback_item_id = imp_fallback.item_id 
                AND imp_main.month_ref = imp_fallback.month_ref
            WHERE imp_main.month_ref IS NOT NULL OR imp_fallback.month_ref IS NOT NULL
        ),
        basket_totals AS (
            -- Aplica os multiplicadores de consumo sobre o preço unitário normalizado
            SELECT
                month_ref,
                SUM(unit_price * CASE 
                    WHEN produto_subcategoria = 40003 THEN 2.81 -- Arroz 2.5kg
                    WHEN produto_subcategoria = 30001 THEN 6.19 -- Leite 5L
                    WHEN produto_subcategoria = 20001 THEN 3.0 -- Ovos 2dz
                    WHEN produto_subcategoria = 10023 THEN 2.81 -- Carne 3kg
                    WHEN produto_subcategoria = 10011 THEN 3.57 -- Frango 4kg
                    When produto_subcategoria = 40012 THEN 1.23 -- Feijão 2kg
                    When produto_subcategoria = 40017 THEN 0.92 -- Farinha 1kg
                    When produto_subcategoria = 80002 THEN 1.4 -- Açúcar 1kg
                    ELSE 1.0 -- Óleo, Café (1 un/kg)
                END) AS total_brl
            FROM monthly_prices
            GROUP BY month_ref
        )
        SELECT 
            bt.month_ref,
            bt.total_brl,
            mwh.wage_amount AS minimum_wage_brl,
            ROUND((bt.total_brl / mwh.wage_amount) * 100, 2) AS percentage_of_wage
        FROM basket_totals bt
        LEFT JOIN inflacao_brasil.minimum_wage_history mwh 
            ON mwh.effective_from = (
                SELECT MAX(effective_from) 
                FROM inflacao_brasil.minimum_wage_history 
                WHERE effective_from <= (bt.month_ref || '-01')::DATE
            )
        WHERE (:month_ref IS NULL OR bt.month_ref = :month_ref)
        ORDER BY bt.month_ref DESC
    """

    result = db.execute(text(query_sql), {"month_ref": month_ref})
    rows = result.fetchall()

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
def get_basket_hours(
    month_ref: str | None = Query(
        None,
        max_length=8,
        description="Mês no formato YYYY-MM. Se nulo, retorna todos os meses.",
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Calculate how many hours of minimum wage work are needed to buy the basket.
    
    Uses standard 160 hours per month (8 hours/day × 20 working days).
    
    Args:
        month_ref: Optional month in YYYY-MM format. If not provided, returns all months.
        db: Database session dependency.
    
    Returns:
        List with month_ref and working_hours needed.
    """
    validate_month_ref(month_ref, db)

    query_sql = """
        SELECT 
            bmv.month_ref,
            ROUND(bmv.basket_value_brl / (mwh.wage_amount / 160.0), 2) AS working_hours
        FROM inflacao_brasil.basket_monthly_value bmv
        LEFT JOIN inflacao_brasil.minimum_wage_history mwh 
            ON mwh.effective_from = (
                SELECT MAX(effective_from) 
                FROM inflacao_brasil.minimum_wage_history 
                WHERE effective_from <= (bmv.month_ref || '-01')::DATE
            )
        WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
        AND (:month_ref IS NULL OR bmv.month_ref = :month_ref)
        ORDER BY bmv.month_ref DESC
    """

    result = db.execute(text(query_sql), {"month_ref": month_ref})
    rows = result.fetchall()

    return [
        {
            "month_ref": row[0],
            "working_hours": row[1],
        }
        for row in rows
    ]


@router.get("/inflation/month", response_model=list[BasketInflationResponse])
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
                , (SELECT monthly_inflation_pct FROM inflacao_brasil.ipca_monthly_public ip WHERE ip.month_ref = cm.month_ref) AS ipca_monthly_pct
                , (
                    SELECT annual_inflation_pct
                    FROM inflacao_brasil.ipca_monthly ip
                    WHERE EXTRACT(YEAR FROM ip.effective_date) = SUBSTRING(cm.month_ref, 1, 4)::INTEGER
                    ORDER BY ip.effective_date DESC
                    LIMIT 1
                ) AS annual_ipca_pct
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
                , (SELECT monthly_inflation_pct FROM inflacao_brasil.ipca_monthly_public ip WHERE ip.month_ref = bmv.month_ref) AS ipca_monthly_pct
                , (
                    SELECT annual_inflation_pct
                    FROM inflacao_brasil.ipca_monthly ip
                    WHERE EXTRACT(YEAR FROM ip.effective_date) = SUBSTRING(bmv.month_ref, 1, 4)::INTEGER
                    ORDER BY ip.effective_date DESC
                    LIMIT 1
                ) AS annual_ipca_pct
            FROM inflacao_brasil.basket_monthly_value bmv
            WHERE bmv.basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            ORDER BY bmv.month_ref DESC
        """)
        result = db.execute(query)

    rows = result.fetchall()
    return [
        BasketInflationResponse(
            month_ref=row[0],
            actual_month_value_brl=round(float(row[1]), 2),
            previous_month_value_brl=round(float(row[2]), 2) if row[2] is not None else None,
            basket_difference_brl=round(float(row[3]), 2) if row[3] is not None else None,
            inflation_pct=row[4],
            ipca_monthly_pct=row[5],
            annual_ipca_pct=_get_annual_ipca_pct(db, row[0]),
        )
        for row in rows
    ]


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
            END AS annual_inflation_pct,
            (
                SELECT annual_inflation_pct
                FROM inflacao_brasil.ipca_monthly ip
                WHERE EXTRACT(YEAR FROM ip.effective_date) = y.year
                ORDER BY ip.effective_date DESC
                LIMIT 1
            ) AS annual_ipca_pct
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
            start_month_value_brl=round(float(row[4]), 2),  # Previous year end value
            end_month_ref=row[1],  # Current year end month
            end_month_value_brl=round(float(row[2]), 2),  # Current year end value
            annual_difference_brl=round(float(row[5]), 2),  # Annual difference
            annual_inflation_pct=row[6],
            annual_ipca_pct=_get_annual_ipca_pct(db, row[1]),
        )
        for row in rows
    ]
