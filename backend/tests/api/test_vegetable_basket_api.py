"""Tests for /api/vegetable-basket/* endpoints."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from backend.src.api.app import app
from backend.src.api.vegetable_basket import (
    VEGGIE_ITEM_NAMES,
    _veggie_item_name,
    _veggie_name_case_sql,
)
from backend.src.database.session import get_db


@pytest.fixture
def db_session():
    return MagicMock()


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_veggie_item_name_known():
    assert _veggie_item_name(50008) == "Tomate Comum"
    assert _veggie_item_name(50005) == "Batata Inglesa"
    assert _veggie_item_name(50004) == "Batata Doce"


def test_veggie_item_name_unknown_returns_produto():
    assert _veggie_item_name(99999) == "Produto"


def test_veggie_name_case_sql_contains_all_subcats():
    sql = _veggie_name_case_sql("col")
    for subcat in VEGGIE_ITEM_NAMES:
        assert str(subcat) in sql


def test_veggie_name_case_sql_replaces_column():
    sql = _veggie_name_case_sql("im.produto_subcategoria")
    assert "im.produto_subcategoria" in sql
    assert "{col}" not in sql


# GET /api/vegetable-basket/items/price
@patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=0.43)
@patch("backend.src.api.vegetable_basket._resolve_unit_price")
@patch("backend.src.api.vegetable_basket._load_veggie_items")
@patch("backend.src.api.vegetable_basket._item_id_for_subcat")
@patch("backend.src.api.vegetable_basket._get_item_key_row")
def test_items_price_returns_latest_when_no_month(
    mock_key_row, mock_item_id, mock_load, mock_resolve, mock_ipca, client, db_session
):
    # validate_month_ref passes (month_ref=None skips check)
    db_session.execute.return_value.scalar.return_value = "2026-04"

    mock_load.return_value = [(50008, 50009, "KG")]
    mock_item_id.return_value = 38
    mock_resolve.return_value = (8.75, 38)
    mock_key_row.return_value = (38, 5, 50008, "1", "KG")

    response = client.get("/api/vegetable-basket/items/price")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "basket_items" in data


@patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=0.43)
@patch("backend.src.api.vegetable_basket._resolve_unit_price")
@patch("backend.src.api.vegetable_basket._load_veggie_items")
@patch("backend.src.api.vegetable_basket._item_id_for_subcat")
@patch("backend.src.api.vegetable_basket._get_item_key_row")
def test_items_price_specific_month(
    mock_key_row, mock_item_id, mock_load, mock_resolve, mock_ipca, client, db_session
):
    db_session.execute.return_value.scalar.return_value = 1  # validate passes

    mock_load.return_value = [
        (50008, 50009, "KG"),
        (50025, 50024, "KG"),
    ]
    mock_item_id.return_value = 38
    mock_key_row.return_value = (38, 5, 50008, "1", "KG")

    def resolve(db, item_id, month_ref, fallback=None):
        prices = {
            (38, "2026-03"): (8.0, 38),
            (38, "2026-02"): (7.0, 38),
        }
        return prices.get((item_id, month_ref), (None, None))

    mock_resolve.side_effect = resolve

    response = client.get("/api/vegetable-basket/items/price?month_ref=2026-03")
    assert response.status_code == 200


def test_items_price_404_when_no_data(client, db_session):
    db_session.execute.return_value.scalar.return_value = 0
    response = client.get("/api/vegetable-basket/items/price?month_ref=2099-01")
    assert response.status_code == 404


def test_items_price_400_month_too_long(client, db_session):
    response = client.get("/api/vegetable-basket/items/price?month_ref=2026-01-01")
    assert response.status_code == 422  # FastAPI rejects max_length=7


@patch("backend.src.api.vegetable_basket._load_veggie_items")
@patch("backend.src.api.vegetable_basket._item_id_for_subcat")
@patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=None)
def test_items_price_fallback_used_when_primary_missing(
    mock_ipca, mock_item_id, mock_load, client, db_session
):
    db_session.execute.return_value.scalar.return_value = 1

    mock_load.return_value = [(50079, 50080, "PC/UN")]

    with (
        patch("backend.src.api.vegetable_basket._resolve_unit_price") as mock_resolve,
        patch("backend.src.api.vegetable_basket._get_item_key_row") as mock_key_row,
    ):
        mock_item_id.side_effect = lambda db, subcat, unit: (
            None if subcat == 50079 else 16
        )
        mock_resolve.return_value = (3.37, 16)
        mock_key_row.return_value = (16, 5, 50080, "1", "PC/UN")

        response = client.get("/api/vegetable-basket/items/price?month_ref=2026-04")
        assert response.status_code == 200
        data = response.json()
        # Should have resolved via fallback (subcat 50080)
        subcats = [i["produto_subcategoria"] for i in data["items"]]
        assert 50080 in subcats


# GET /api/vegetable-basket/villains
def test_villains_groups_by_month(client, db_session):
    db_session.execute.return_value.scalar.return_value = 2
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", "Cenoura",       80.16, 8.99, 0.43),
        ("2026-04", "Batata Inglesa",45.11, 5.79, 0.43),
        ("2026-04", "Cebola",        19.05, 4.75, 0.43),
        ("2026-03", "Tomate Comum",  25.18, 7.00, 0.40),
    ]
    response = client.get("/api/vegetable-basket/villains?year=2026")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["month_ref"] == "2026-04"
    assert len(data[0]["villains"]) == 3
    assert data[0]["villains"][0]["name"] == "Cenoura"
    assert data[0]["villains"][0]["inflation"] == 80.16


def test_villains_without_year_returns_all(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", "Cenoura", 80.16, 8.99, 0.43),
        ("2025-12", "Tomate Comum", 12.0, 7.50, 0.38),
    ]
    response = client.get("/api/vegetable-basket/villains")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_villains_422_when_year_out_of_range(client, db_session):
    """FastAPI rejects years above le= constraint before our handler runs."""
    response = client.get("/api/vegetable-basket/villains?year=2099")
    assert response.status_code == 422


def test_villains_404_when_year_in_range_has_no_data(client, db_session):
    """A valid year with no rows in the table returns 404."""
    db_session.execute.return_value.scalar.return_value = 0
    response = client.get("/api/vegetable-basket/villains?year=2022")
    assert response.status_code == 404


def test_villains_ipca_propagated_correctly(client, db_session):
    db_session.execute.return_value.scalar.return_value = 1
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", "Cenoura", 80.16, 8.99, 0.43),
    ]
    response = client.get("/api/vegetable-basket/villains?year=2026")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["ipca_monthly_pct"] == pytest.approx(0.43)


# ---------------------------------------------------------------------------
# GET /api/vegetable-basket/wage
# ---------------------------------------------------------------------------

def test_wage_returns_all_months(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", 60.88, 1620.00, 3.76),
        ("2026-03", 56.57, 1620.00, 3.49),
    ]
    response = client.get("/api/vegetable-basket/wage")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["month_ref"] == "2026-04"
    assert float(data[0]["basket_value_brl"]) == pytest.approx(60.88)
    assert float(data[0]["percentage_of_wage"]) == pytest.approx(3.76)


def test_wage_specific_month(client, db_session):
    db_session.execute.return_value.scalar.return_value = 1
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", 60.88, 1620.00, 3.76)
    ]
    response = client.get("/api/vegetable-basket/wage?month_ref=2026-04")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_wage_404_when_month_ref_invalid(client, db_session):
    db_session.execute.return_value.scalar.return_value = 0
    response = client.get("/api/vegetable-basket/wage?month_ref=2099-01")
    assert response.status_code == 404


# GET /api/vegetable-basket/hours
def test_hours_returns_all_months(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", 6.00),
        ("2026-03", 5.58),
    ]
    response = client.get("/api/vegetable-basket/hours")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["month_ref"] == "2026-04"
    assert float(data[0]["working_hours"]) == pytest.approx(6.00)


def test_hours_specific_month(client, db_session):
    db_session.execute.return_value.scalar.return_value = 1
    db_session.execute.return_value.fetchall.return_value = [("2026-04", 6.00)]
    response = client.get("/api/vegetable-basket/hours?month_ref=2026-04")
    assert response.status_code == 200
    assert response.json()[0]["working_hours"] == pytest.approx(6.00)


def test_hours_404_when_month_not_found(client, db_session):
    db_session.execute.return_value.scalar.return_value = 0
    response = client.get("/api/vegetable-basket/hours?month_ref=2099-01")
    assert response.status_code == 404


# GET /api/vegetable-basket/inflation/month
def test_inflation_month_all(client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", 60.88, 56.57, 4.31, 7.62),
        ("2026-03", 56.57, 59.91, -3.34, -5.57),
    ]
    with (
        patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=0.43),
        patch("backend.src.api.vegetable_basket._get_annual_ipca_pct", return_value=5.0),
    ):
        response = client.get("/api/vegetable-basket/inflation/month")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["month_ref"] == "2026-04"
    assert float(data[0]["actual_month_value_brl"]) == pytest.approx(60.88)
    assert float(data[0]["basket_difference_brl"]) == pytest.approx(4.31)


def test_inflation_month_specific(client, db_session):
    db_session.execute.return_value.scalar.return_value = 1
    db_session.execute.return_value.fetchall.return_value = [
        ("2026-04", 60.88, 56.57, 4.31, 7.62)
    ]
    with (
        patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=0.43),
        patch("backend.src.api.vegetable_basket._get_annual_ipca_pct", return_value=5.0),
    ):
        response = client.get("/api/vegetable-basket/inflation/month?month_ref=2026-04")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_inflation_month_null_previous_handled(client, db_session):
    """First month in history has no previous — should return None gracefully."""
    db_session.execute.return_value.fetchall.return_value = [
        ("2022-07", 39.31, None, None, None)
    ]
    with (
        patch("backend.src.api.vegetable_basket._get_ipca_monthly_pct", return_value=None),
        patch("backend.src.api.vegetable_basket._get_annual_ipca_pct", return_value=None),
    ):
        response = client.get("/api/vegetable-basket/inflation/month")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["previous_month_value_brl"] is None
    assert data[0]["inflation_pct"] is None


# GET /api/vegetable-basket/inflation/annual
@patch("backend.src.api.vegetable_basket._get_annual_ipca_pct", return_value=4.62)
def test_inflation_annual_structure(mock_ipca, client, db_session):
    db_session.execute.return_value.fetchall.return_value = [
        (2023, "2023-12", 58.37, "2022-12", 52.53, 5.84, 11.12),
        (2024, "2024-12", 61.87, "2023-12", 58.37, 3.50, 5.99),
    ]
    response = client.get("/api/vegetable-basket/inflation/annual")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["year"] == 2023
    assert data[0]["end_month_ref"] == "2023-12"
    assert float(data[0]["annual_inflation_pct"]) == pytest.approx(11.12)
    assert data[0]["annual_ipca_pct"] == pytest.approx(4.62)


@patch("backend.src.api.vegetable_basket._get_annual_ipca_pct", return_value=None)
def test_inflation_annual_current_year_ytd(mock_ipca, client, db_session):
    """Current year without December uses Jan as start (YTD)."""
    db_session.execute.return_value.fetchall.return_value = [
        (2026, "2026-04", 60.88, "2026-01", 57.18, 3.70, 6.47),
    ]
    response = client.get("/api/vegetable-basket/inflation/annual")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["start_month_ref"] == "2026-01"
    assert data[0]["end_month_ref"] == "2026-04"
