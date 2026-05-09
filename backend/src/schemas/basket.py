from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class BasketItemResponse(BaseModel):
    """Response model for a basket item with price data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    produto_categoria: int
    produto_subcategoria: int
    item_name: str
    qtd_embalagem: str
    month_ref: str
    month_price: Decimal | None
    previous_price: Decimal | None
    mom_pct: float | None


class BasketResponse(BaseModel):
    """Response model for basket data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    basket_code: str
    basket_name: str
    items: list[BasketItemResponse]


class BasketValueResponse(BaseModel):
    """Response model for pre-calculated basket values."""
    
    model_config = ConfigDict(from_attributes=True)
    
    month_ref: str
    basket_value_brl: Decimal
    minimum_wage_brl: Decimal | None
    percentage_of_wage: float | None


class BasketInflationResponse(BaseModel):
    """Response model for basket inflation (MoM) data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    month_ref: str
    actual_month_value_brl: Decimal
    previous_month_value_brl: Decimal | None
    basket_difference_brl: Decimal | None
    inflation_pct: float | None

class BasketAnnualInflationResponse(BaseModel):
    """Response model for annual basket inflation data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    year: int
    start_month_ref: str
    start_month_value_brl: Decimal
    end_month_ref: str
    end_month_value_brl: Decimal
    annual_difference_brl: Decimal
    annual_inflation_pct: float

class VillainItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    inflation: float | None
    value: Decimal | None

class MonthlyVillains(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month_ref: str
    villains: list[VillainItem]