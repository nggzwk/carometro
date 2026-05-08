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
    current_price: Decimal | None
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