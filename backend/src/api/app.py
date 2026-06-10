import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import basket
from . import global_baskets
from . import vegetable_basket

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://ocarometro.com,https://www.ocarometro.com")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw.split(",") if origin.strip()]

app = FastAPI(
    title="Inflação Brasil API",
    description="API for inflation data and basket tracking",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(basket.router)
app.include_router(vegetable_basket.router)
app.include_router(global_baskets.router)
