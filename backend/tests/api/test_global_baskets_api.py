from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.src.api.app import app
from backend.src.database.session import get_db


@pytest.fixture
def db_session():
    db = MagicMock()
    yield db


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _result_with_rows(rows):
    result = MagicMock()
    result.fetchall.return_value = rows
    return result


def test_get_global_baskets_converts_to_brl(client, db_session):
    rates_rows = [
        ("BRL", Decimal("0.2"), "2024-01-01"),
        ("USD", Decimal("1"), "2024-01-01"),
    ]
    basket_rows = [
        (
            1,
            "Brazil",
            "IBGE",
            "brl",
            Decimal("1000"),
            Decimal("200"),
            Decimal("100"),
            Decimal("50"),
            44,
            "2024-01-10",
        )
    ]
    db_session.execute.side_effect = [
        _result_with_rows(basket_rows),
        _result_with_rows(rates_rows),
    ]

    response = client.get("/api/global-baskets")
    assert response.status_code == 200
    data = response.json()

    assert data[0]["local_currency_code"] == "BRL"
    assert data[0]["monthly_min_wage_usd"] == "100"
    assert data[0]["monthly_min_wage_brl"] == "500"
    assert data[0]["basket_cost_brl"] == "250"


def test_get_global_baskets_without_brl_rate_returns_null_brl(client, db_session):
    rates_rows = [("USD", Decimal("1"), "2024-01-01")]
    basket_rows = [
        (
            1,
            "Brazil",
            "IBGE",
            "BRL",
            Decimal("1000"),
            Decimal("200"),
            Decimal("100"),
            Decimal("50"),
            44,
            "2024-01-10",
        )
    ]
    # The endpoint fetches basket rows first, then exchange rates.
    db_session.execute.side_effect = [
        _result_with_rows(basket_rows),
        _result_with_rows(rates_rows),
    ]

    response = client.get("/api/global-baskets")
    assert response.status_code == 200
    data = response.json()

    assert data[0]["monthly_min_wage_brl"] is None
    assert data[0]["basket_cost_brl"] is None
