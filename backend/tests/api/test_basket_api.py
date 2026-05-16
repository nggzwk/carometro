import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from backend.src.api.app import app
from backend.src.api.basket import (
    _previous_month_ref,
    _parse_pack_size,
    _item_name_from_subcategory,
    validate_month_ref,
)
from backend.src.database.session import get_db

# Test data
mock_basket_items = [
    (1, 10011, "Filé de peito de frango sem osso", "1kg", "2023-01", 20.0, 18.0, 11.11, 0.5),
    (2, 10023, "Coxão mole sem osso", "1kg", "2023-01", 40.0, 42.0, -4.76, 0.5),
]

mock_villains = [
    {
        "month_ref": "2023-01",
        "ipca_monthly_pct": 0.53,
        "villains": [
            {"item_name": "Item A", "inflation": 15.2, "value": 11.52},
            {"item_name": "Item B", "inflation": 10.1, "value": 22.02},
        ],
    }
]

mock_basket_values = [
    {
        "month_ref": "2023-01",
        "basket_value_brl": 600.0,
        "minimum_wage_brl": 1302.0,
        "percentage_of_wage": 46.08,
    }
]

mock_basket_hours = [{"month_ref": "2023-01", "working_hours": 73.85}]

mock_basket_inflation = [
    {
        "month_ref": "2023-01",
        "actual_month_value_brl": 600.0,
        "previous_month_value_brl": 580.0,
        "basket_difference_brl": 20.0,
        "inflation_pct": 3.45,
        "ipca_monthly_pct": 0.53,
        "annual_ipca_pct": 5.77,
    }
]

mock_annual_inflation = [
    {
        "year": 2023,
        "start_month_ref": "2022-12",
        "start_month_value_brl": 580.0,
        "end_month_ref": "2023-12",
        "end_month_value_brl": 620.0,
        "annual_difference_brl": 40.0,
        "annual_inflation_pct": 6.9,
        "annual_ipca_pct": 4.62,
    }
]


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


# Helper function tests
def test_previous_month_ref():
    assert _previous_month_ref("2023-03") == "2023-02"
    assert _previous_month_ref("2023-01") == "2022-12"


def test_parse_pack_size():
    assert _parse_pack_size("1,5") == 1.5
    assert _parse_pack_size("1,5kg") is None
    assert _parse_pack_size("100g") is None
    assert _parse_pack_size(None) is None


def test_item_name_from_subcategory():
    assert _item_name_from_subcategory(10011) == "Filé de peito de frango sem osso"
    assert _item_name_from_subcategory(99999) == "Produto"


def test_validate_month_ref_valid(db_session):
    db_session.execute.return_value.scalar.return_value = 1
    assert validate_month_ref("2023-01", db_session) is None


def test_validate_month_ref_invalid_format(db_session):
    db_session.execute.return_value.scalar.return_value = 1
    assert validate_month_ref("2023-1", db_session) is None


def test_validate_month_ref_no_data(db_session):
    db_session.execute.return_value.scalar.return_value = 0
    with pytest.raises(Exception):
        validate_month_ref("2023-01", db_session)


# Endpoint tests
@patch("backend.src.api.basket._get_ipca_monthly_pct", return_value=0.71)
@patch("backend.src.api.basket._resolve_unit_price")
@patch("backend.src.api.basket._load_basket_items")
def test_get_basket_items(
    mock_load_basket_items,
    mock_resolve_unit_price,
    mock_get_ipca,
    client,
    db_session,
):
    db_session.execute.return_value.scalar.return_value = 1
    mock_load_basket_items.return_value = [
        (2, 2, 20001, "1", "DZ", 1.0, None),
        (1, 1, 10011, "1", "KG", 1.0, None),
    ]

    def resolve_side_effect(db, item_id, month_ref, fallback_item_id=None):
        prices = {
            (1, "2023-03"): (15.9, 1),
            (1, "2023-02"): (15.9, 1),
            (2, "2023-03"): (10.99, 2),
            (2, "2023-02"): (7.98, 2),
        }
        return prices.get((item_id, month_ref), (None, None))

    mock_resolve_unit_price.side_effect = resolve_side_effect

    response = client.get("/api/basket/items/price?month_ref=2023-03")
    assert response.status_code == 200
    data = response.json()
    assert "basket_items" in data
    assert "items" in data
    assert [item["produto_subcategoria"] for item in data["items"]] == [10011, 20001]


@patch("backend.src.api.basket._get_annual_ipca_pct", return_value=5.77)
def test_get_basket_inflation(mock_get_annual, client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        (
            "2023-01",
            600.0,
            580.0,
            20.0,
            3.45,
            0.53,
        )
    ]
    response = client.get("/api/basket/inflation/month?month_ref=2023-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["month_ref"] == "2023-01"
    assert data[0]["annual_ipca_pct"] == 5.77


@patch("backend.src.api.basket._get_annual_ipca_pct", return_value=4.62)
def test_get_basket_annual_inflation(mock_get_annual, client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        (2023, "2023-12", 620.0, "2022-12", 580.0, 40.0, 6.90, 4.62)
    ]
    response = client.get("/api/basket/inflation/annual")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["year"] == 2023
    assert data[0]["annual_ipca_pct"] == 4.62


def test_get_basket_villains(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2023-01", "Item A", 15.2, 11.52, 0.53),
        ("2023-01", "Item B", 10.1, 22.02, 0.53),
    ]
    response = client.get("/api/basket/villains?year=2023")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["month_ref"] == "2023-01"


def test_get_basket_values(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2023-01", 600.0, 1302.0, 46.08)
    ]
    response = client.get("/api/basket/wage?month_ref=2023-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["month_ref"] == "2023-01"


def test_get_basket_hours(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [("2023-01", 73.85)]
    response = client.get("/api/basket/hours?month_ref=2023-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["month_ref"] == "2023-01"
