from decimal import Decimal
import json
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.basket import GlobalBasketReferenceResponse
from ..schemas.basket import (
    DieeseBasketItemsWithReferenceResponse,
    DieeseBasketItemResponse,
    BasketValueResponse,
)

from .basket import (
    _resolve_unit_price,
    validate_month_ref,
    _previous_month_ref,
    _get_ipca_monthly_pct,
    _get_item_key_row,
    _item_name_from_subcategory,
    _load_basket_items,
)

router = APIRouter(prefix="/api/global-baskets", tags=["global-baskets"])

DIEESE_ITEMS = [
    ("Carne", 10023, None, 6.6, "kg"),
    ("Leite", 30001, None, 7.5, "L"),
    ("Feijao", 40012, 40011, 4.5, "KG"),
    ("Arroz", 40003, None, 3.0, "kg"),
    ("Farinha de trigo", 40017, None, 1.5, "kg"),
    ("Batata", 50005, None, 6.0, "kg"),
    ("Tomate", 50009, None, 9.0, "kg"),
    ("Pão", 90027, None, 6.0, "kg"),
    ("Café", 90001, None, 0.6, "kg"),
    ("Banana", 50025, 50024, 6.75, "kg"),
    ("Açucar", 80002, None, 3.0, "kg"),
    ("Óleo de soja", 60001, None, 0.9, "L"),
    ("Manteiga", 70012, None, 0.75, "kg"),
]


def _to_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _load_exchange_rates(db: Session) -> dict[str, tuple[Decimal, object]]:
    query = text("""
        SELECT currency_code, rate_to_usd, updated_at
        FROM inflacao_brasil.currency_exchange_rates
    """)
    rows = db.execute(query).fetchall()
    rates: dict[str, tuple[Decimal, object]] = {}
    for row in rows:
        try:
            currency_code, rate_to_usd, updated_at = row[:3]
        except Exception:
            continue
        rate = _to_decimal(rate_to_usd)
        if rate is None:
            continue
        rates[str(currency_code).upper()] = (rate, updated_at)
    return rates


def _unit_multiplier_decimal(dieese_unit: str, item_unit: str) -> Decimal:
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


# load optional subcategory names from data-pipeline rules to fill missing names
_SUBCATEGORY_NAME_MAP: dict[int, str] | None = None


def _load_subcategory_name_map() -> dict[int, str]:
    global _SUBCATEGORY_NAME_MAP
    if _SUBCATEGORY_NAME_MAP is not None:
        return _SUBCATEGORY_NAME_MAP
    root = Path(__file__).resolve().parents[3]
    candidate = root / "data-pipeline" / "scripts" / "csv_cleaner" / "standardize" / "rules_subcategories_v1.json"
    if not candidate.exists():
        _SUBCATEGORY_NAME_MAP = {}
        return _SUBCATEGORY_NAME_MAP
    try:
        with candidate.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
        out: dict[int, str] = {}
        for entry in payload.get("subcategories", []):
            sid = entry.get("id")
            name = entry.get("name")
            if isinstance(sid, int) and isinstance(name, str):
                out[sid] = name
        _SUBCATEGORY_NAME_MAP = out
    except Exception:
        _SUBCATEGORY_NAME_MAP = {}
    return _SUBCATEGORY_NAME_MAP


def _find_item_id_for_subcat(db: Session, produto_subcategoria: int) -> int | None:
    q = text(
        "SELECT id FROM inflacao_brasil.item_key WHERE produto_subcategoria = :subcat"
        " ORDER BY NULLIF(CAST(REGEXP_REPLACE(qtd_embalagem, '[^0-9,\\.]', '', 'g') AS NUMERIC), 0) DESC NULLS LAST, id LIMIT 1"
    )
    r = db.execute(q, {"subcat": produto_subcategoria}).fetchone()
    return int(r[0]) if r is not None else None


def _get_default_basket_item_id(
    db: Session, produto_subcategoria: int
) -> int | None:
    for item_id, _, subcat, _, _, _, _ in _load_basket_items(db):
        if subcat == produto_subcategoria:
            return int(item_id)
    return None


def _find_latest_month_for_items(db: Session, *item_ids: int) -> str | None:
    ids = [i for i in item_ids if i is not None]
    if not ids:
        return None
    if len(ids) == 1:
        q = text("SELECT MAX(month_ref) FROM inflacao_brasil.item_monthly_price WHERE item_id = :p")
        return db.execute(q, {"p": ids[0]}).scalar()
    placeholders = ",".join([f":id{i}" for i in range(len(ids))])
    q = text(f"SELECT MAX(month_ref) FROM inflacao_brasil.item_monthly_price WHERE item_id IN ({placeholders})")
    params = {f"id{i}": v for i, v in enumerate(ids)}
    return db.execute(q, params).scalar()


def _get_latest_dieese_wage(db: Session) -> BasketValueResponse | None:
    q = text("SELECT MAX(month_ref) FROM inflacao_brasil.item_monthly_price")
    month_ref = db.execute(q).scalar()
    if not month_ref:
        return None

    total = Decimal("0")
    for _, primary_subcat, fallback_subcat, quantity, unit in DIEESE_ITEMS:
        res = _compute_dieese_item(db, primary_subcat, fallback_subcat, quantity, unit, month_ref)
        if res is None:
            continue
        try:
            total += Decimal(str(res["qtd_month_price"]))
        except Exception:
            pass

    wage_q = text(
        "SELECT wage_amount FROM inflacao_brasil.minimum_wage_history "
        "WHERE effective_from = (SELECT MAX(effective_from) FROM inflacao_brasil.minimum_wage_history WHERE effective_from <= (:m || '-01')::DATE)"
    )
    wage_row = db.execute(wage_q, {"m": month_ref}).fetchone()
    minimum_wage = Decimal(str(wage_row[0])) if wage_row and wage_row[0] is not None else None

    percentage_of_wage = None
    if minimum_wage and minimum_wage != 0:
        try:
            percentage_of_wage = round(float((total / minimum_wage) * 100), 2)
        except Exception:
            percentage_of_wage = None

    return BasketValueResponse(
        month_ref=month_ref,
        basket_value_brl=round(float(total), 2),
        minimum_wage_brl=minimum_wage,
        percentage_of_wage=percentage_of_wage,
    )


def _compute_dieese_item(db: Session, primary_subcat: int, fallback_subcat: int | None, quantity: float, dieese_unit: str, month_ref: str | None):
    primary_id = _get_default_basket_item_id(db, primary_subcat) or _find_item_id_for_subcat(db, primary_subcat)
    fallback_id = (
        _get_default_basket_item_id(db, fallback_subcat)
        if fallback_subcat is not None
        else None
    ) or (
        _find_item_id_for_subcat(db, fallback_subcat) if fallback_subcat else None
    )
    chosen_id = primary_id or fallback_id
    if not chosen_id:
        return None

    resolved_month = month_ref
    if not resolved_month:
        resolved_month = _find_latest_month_for_items(db, primary_id, fallback_id) or None

    unit_price, used_item_id = (None, None)
    if resolved_month and primary_id is not None:
        unit_price, used_item_id = _resolve_unit_price(db, primary_id, resolved_month, fallback_id)
    if (unit_price is None or used_item_id is None) and fallback_id is not None and resolved_month:
        unit_price, used_item_id = _resolve_unit_price(db, fallback_id, resolved_month, None)
    if unit_price is None or used_item_id is None:
        return None

    item_key_row = _get_item_key_row(db, used_item_id)
    pack_unit = item_key_row[4] if item_key_row is not None else None
    mult_dec = _unit_multiplier_decimal(str(dieese_unit), str(pack_unit or ""))
    desired_qty = Decimal(str(quantity)) * mult_dec
    month_price = Decimal(str(unit_price)) * desired_qty

    prev_m = _previous_month_ref(resolved_month) if resolved_month else None
    previous_price = None
    if prev_m:
        prev_unit_price, _ = _resolve_unit_price(db, used_item_id, prev_m, None)
        if prev_unit_price is not None:
            previous_price = Decimal(str(prev_unit_price)) * desired_qty

    mom_pct = None
    if previous_price is not None and previous_price != 0:
        try:
            mom_pct = round(((month_price / previous_price) - 1) * 100, 2)
        except Exception:
            mom_pct = None

    ipca_pct = _get_ipca_monthly_pct(db, resolved_month) if resolved_month else None

    item_name = _item_name_from_subcategory(primary_subcat)
    if item_name == "Produto":
        if item_key_row is not None:
            try:
                item_name = _item_name_from_subcategory(int(item_key_row[2]))
            except Exception:
                pass
        if item_name == "Produto":
            names_map = _load_subcategory_name_map()
            maybe = names_map.get(primary_subcat) or (item_key_row and names_map.get(int(item_key_row[2])))
            if maybe:
                item_name = maybe

    return {
        "produto_subcategoria": primary_subcat,
        "item_name": item_name,
        "qtd_basket_dieese": f"{quantity}{dieese_unit}",
        "month_ref": resolved_month or "latest",
        "qtd_month_price": f"{month_price:.4f}",
        "qtd_previous_month_price": f"{previous_price:.4f}" if previous_price is not None else None,
        "mom_pct": mom_pct,
        "ipca_monthly_pct": ipca_pct,
    }


@router.get("", response_model=list[GlobalBasketReferenceResponse])
def get_global_baskets(db: Session = Depends(get_db)) -> list[GlobalBasketReferenceResponse]:
    query = text("""
        SELECT
            id,
            country_region,
            responsible_authority,
            local_currency_code,
            raw_monthly_min_wage,
            raw_basket_cost,
            monthly_min_wage_usd,
            basket_cost_usd,
            workweek_hours,
            last_updated_at
        FROM inflacao_brasil.global_basket_references
        ORDER BY id
    """)
    rows = db.execute(query).fetchall()

    rates = _load_exchange_rates(db)
    brl_rate = rates.get("BRL")
    brl_rate_to_usd = brl_rate[0] if brl_rate else None
    dieese_wage = _get_latest_dieese_wage(db)
    dieese_basket_brl = dieese_wage.basket_value_brl if dieese_wage else None

    response: list[GlobalBasketReferenceResponse] = []
    for (
        item_id,
        country_region,
        responsible_authority,
        local_currency_code,
        raw_monthly_min_wage,
        raw_basket_cost,
        stored_monthly_min_wage_usd,
        stored_basket_cost_usd,
        workweek_hours,
        last_updated_at,
    ) in rows:
        currency_code = str(local_currency_code).upper()
        rate_entry = rates.get(currency_code)
        rate_to_usd = rate_entry[0] if rate_entry else None
        rate_updated_at = rate_entry[1] if rate_entry else None

        raw_wage = _to_decimal(raw_monthly_min_wage)
        raw_basket = _to_decimal(raw_basket_cost)
        stored_wage_usd = _to_decimal(stored_monthly_min_wage_usd)
        stored_basket_usd = _to_decimal(stored_basket_cost_usd)

        monthly_min_wage_usd = stored_wage_usd
        basket_cost_usd = stored_basket_usd

        monthly_min_wage_brl = (
            monthly_min_wage_usd / brl_rate_to_usd
            if monthly_min_wage_usd is not None and brl_rate_to_usd
            else None
        )
        basket_cost_brl = (
            basket_cost_usd / brl_rate_to_usd
            if basket_cost_usd is not None and brl_rate_to_usd
            else None
        )

        if monthly_min_wage_brl is not None:
            try:
                monthly_min_wage_brl = Decimal(format(monthly_min_wage_brl, "f"))
            except Exception:
                pass
        if basket_cost_brl is not None:
            try:
                basket_cost_brl = Decimal(format(basket_cost_brl, "f"))
            except Exception:
                pass

        if currency_code == "BRL" and dieese_basket_brl is not None:
            raw_basket = dieese_basket_brl
            basket_cost_brl = dieese_basket_brl
            if brl_rate_to_usd is not None:
                basket_cost_usd = dieese_basket_brl * brl_rate_to_usd

        response.append(
            GlobalBasketReferenceResponse(
                id=item_id,
                country_region=country_region,
                responsible_authority=responsible_authority,
                local_currency_code=currency_code,
                raw_monthly_min_wage=raw_wage,
                raw_basket_cost=raw_basket,
                workweek_hours=workweek_hours,
                last_updated_at=last_updated_at,
                rate_to_usd=rate_to_usd,
                rate_updated_at=rate_updated_at,
                monthly_min_wage_usd=monthly_min_wage_usd,
                basket_cost_usd=basket_cost_usd,
                monthly_min_wage_brl=monthly_min_wage_brl,
                basket_cost_brl=basket_cost_brl,
            )
        )

    return response


@router.get("/dieese", response_model=DieeseBasketItemsWithReferenceResponse)
def get_dieese_basket(
    month_ref: str | None = None,
    db: Session = Depends(get_db),
) -> DieeseBasketItemsWithReferenceResponse:
    validate_month_ref(month_ref, db)

    rows: list[tuple[int, str, str, str, object, object, object]] = []

    for display_name, primary_subcat, fallback_subcat, quantity, unit in DIEESE_ITEMS:
        result = _compute_dieese_item(db, primary_subcat, fallback_subcat, quantity, unit, month_ref)
        if result is None:
            continue
        rows.append(
            (
                result["produto_subcategoria"],
                result["item_name"],
                result["qtd_basket_dieese"],
                result["month_ref"],
                result["qtd_month_price"],
                result["qtd_previous_month_price"],
                result["mom_pct"],
                result["ipca_monthly_pct"],
            )
        )

    rows = sorted(rows, key=lambda r: r[0])

    items_response = [
        DieeseBasketItemResponse(
            produto_subcategoria=row[0],
            item_name=row[1],
            qtd_basket_dieese=row[2],
            month_ref=row[3],
            qtd_month_price=round(float(row[4]), 2),
            qtd_previous_month_price=round(float(row[5]), 2) if row[5] is not None else None,
            mom_pct=row[6],
            ipca_monthly_pct=row[7],
        )
        for row in rows
    ]

    basket_items_list = [d[0] for d in DIEESE_ITEMS]

    return DieeseBasketItemsWithReferenceResponse(basket_items_dieese=basket_items_list, items=items_response)


@router.get("/dieese/wage", response_model=list[BasketValueResponse])
def get_dieese_month_values(
    month_ref: str | None = None,
    db: Session = Depends(get_db),
) -> list[BasketValueResponse]:
    validate_month_ref(month_ref, db)

    if month_ref:
        months = [month_ref]
    else:
        q = text("SELECT DISTINCT month_ref FROM inflacao_brasil.item_monthly_price ORDER BY month_ref DESC")
        months = [r[0] for r in db.execute(q).fetchall()]

    out: list[BasketValueResponse] = []
    for m in months:
        total = Decimal("0")
        for _, primary_subcat, fallback_subcat, quantity, unit in DIEESE_ITEMS:
            res = _compute_dieese_item(db, primary_subcat, fallback_subcat, quantity, unit, m)
            if res is None:
                continue
            try:
                total += Decimal(str(res["qtd_month_price"]))
            except Exception:
                pass

        wage_q = text(
            "SELECT wage_amount FROM inflacao_brasil.minimum_wage_history "
            "WHERE effective_from = (SELECT MAX(effective_from) FROM inflacao_brasil.minimum_wage_history WHERE effective_from <= (:m || '-01')::DATE)"
        )
        wage_row = db.execute(wage_q, {"m": m}).fetchone()
        minimum_wage = Decimal(str(wage_row[0])) if wage_row and wage_row[0] is not None else None

        percentage_of_wage = None
        if minimum_wage and minimum_wage != 0:
            try:
                percentage_of_wage = round(float((total / minimum_wage) * 100), 2)
            except Exception:
                percentage_of_wage = None

        out.append(
            BasketValueResponse(
                month_ref=m,
                basket_value_brl=round(float(total), 2),
                minimum_wage_brl=minimum_wage,
                percentage_of_wage=percentage_of_wage,
            )
        )

    return out
