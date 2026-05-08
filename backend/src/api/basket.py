from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.basket import BasketItemResponse

router = APIRouter(prefix="/api/basket", tags=["basket"])


@router.get("/items", response_model=list[BasketItemResponse])
def get_basket_items(
    month_ref: str | None = Query(None, description="Month in YYYY-MM format. If null, returns latest month available."),
    db: Session = Depends(get_db)
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
    # Validate month_ref format if provided
    if month_ref is not None:
        if len(month_ref) > 7:
            raise HTTPException(status_code=400, detail="month_ref cannot exceed 7 characters (YYYY-MM format).")
        if len(month_ref) == '':
            raise HTTPException(status_code=400, detail="month_ref cannot be empty")
        
        # Check if data exists for this month
        check_query = text("""
            SELECT COUNT(*) FROM inflacao_brasil.item_monthly_price 
            WHERE month_ref = :month_ref
        """)
        count_result = db.execute(check_query, {"month_ref": month_ref}).scalar()
        if count_result == 0:
            raise HTTPException(status_code=404, detail="No data found for the month.")
    
    if month_ref:
        query = text("""
        SELECT
            lp.produto_categoria,
            lp.produto_subcategoria,
            CASE
                WHEN lp.produto_subcategoria = 10011 THEN 'Filé de peito de frango sem osso'
                WHEN lp.produto_subcategoria = 10023 THEN 'Coxão mole sem osso'
                WHEN lp.produto_subcategoria = 20001 THEN 'Ovos brancos'
                WHEN lp.produto_subcategoria = 40003 THEN 'Arroz polido'
                WHEN lp.produto_subcategoria = 40012 THEN 'Feijão carioca'
                WHEN lp.produto_subcategoria = 40017 THEN 'Farinha de trigo'
                WHEN lp.produto_subcategoria = 60001 THEN 'Óleo de soja'
                WHEN lp.produto_subcategoria = 80002 THEN 'Açúcar cristal'
                ELSE 'Produto'
            END AS item_name,
            (lp.qtd_embalagem || lp.unidade_sigla) AS qtd_embalagem,
            :month_ref AS month_ref,
            lp.median_price AS current_price,
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
                ) AS prev_price
            FROM inflacao_brasil.item_key ik
            LEFT JOIN inflacao_brasil.item_monthly_price imp
                ON ik.id = imp.item_id
            WHERE ik.id IN (
                SELECT item_id FROM inflacao_brasil.basket_item
                WHERE basket_id = (SELECT id FROM inflacao_brasil.basket WHERE code = 'default_basket')
            )
        ) lp
        WHERE lp.month_ref = :month_ref
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
                WHEN lp.produto_subcategoria = 40003 THEN 'Arroz polido'
                WHEN lp.produto_subcategoria = 40012 THEN 'Feijão carioca'
                WHEN lp.produto_subcategoria = 40017 THEN 'Farinha de trigo'
                WHEN lp.produto_subcategoria = 60001 THEN 'Óleo de soja'
                WHEN lp.produto_subcategoria = 80002 THEN 'Açúcar cristal'
                ELSE 'Produto'
            END AS item_name,
            (lp.qtd_embalagem || lp.unidade_sigla) AS qtd_embalagem,
            lp.month_ref,
            lp.median_price AS current_price,
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
            current_price=row[5],
            previous_price=row[6],
            mom_pct=row[7],
        )
        for row in rows
    ]
