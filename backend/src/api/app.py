from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import basket

app = FastAPI(
    title="Inflação Brasil API",
    description="API for inflation data and basket tracking",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(basket.router)
