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
