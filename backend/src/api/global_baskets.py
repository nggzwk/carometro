from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.basket import GlobalBasketReferenceResponse

router = APIRouter(prefix="/api/global-baskets", tags=["global-baskets"])


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


@router.get("", response_model=list[GlobalBasketReferenceResponse])
def get_global_baskets(db: Session = Depends(get_db)) -> list[GlobalBasketReferenceResponse]:
    """Return global basket references with USD and BRL conversions using cached rates."""
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
