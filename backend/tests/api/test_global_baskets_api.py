from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.src.api.app import app
from backend.src.api.global_baskets import _to_decimal, _unit_multiplier_decimal
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


# ── pure helpers ─────────────────────────────────────────────────────────────

class TestToDecimal:
    def test_none_returns_none(self):
        assert _to_decimal(None) is None

    def test_int_converts(self):
        assert _to_decimal(5) == Decimal("5")

    def test_string_converts(self):
        assert _to_decimal("3.14") == Decimal("3.14")

    def test_decimal_passthrough(self):
        assert _to_decimal(Decimal("1.5")) == Decimal("1.5")


class TestUnitMultiplierDecimal:
    def test_kg_to_g(self):
        assert _unit_multiplier_decimal("kg", "g") == Decimal("1000")

    def test_g_to_kg(self):
        assert _unit_multiplier_decimal("g", "kg") == Decimal("0.001")

    def test_l_to_ml(self):
        assert _unit_multiplier_decimal("L", "ml") == Decimal("1000")

    def test_ml_to_l(self):
        assert _unit_multiplier_decimal("ml", "L") == Decimal("0.001")

    def test_same_units(self):
        assert _unit_multiplier_decimal("kg", "kg") == Decimal("1")
        assert _unit_multiplier_decimal("L", "L") == Decimal("1")

    def test_unknown_units_return_one(self):
        assert _unit_multiplier_decimal("pc", "un") == Decimal("1")

    def test_case_insensitive(self):
        assert _unit_multiplier_decimal("KG", "G") == Decimal("1000")


# ── GET /api/global-baskets ───────────────────────────────────────────────────

@patch("backend.src.api.global_baskets._get_latest_dieese_wage", return_value=None)
@patch("backend.src.api.global_baskets._get_latest_usa_basket_usd", return_value=None)
def test_get_global_baskets_converts_to_brl(mock_usa, mock_dieese, client, db_session):
    rates_rows = [
        ("BRL", Decimal("0.2"), "2024-01-01"),
        ("USD", Decimal("1"), "2024-01-01"),
    ]
    basket_rows = [
        (1, "Brazil", "IBGE", "brl", Decimal("1000"), Decimal("200"), Decimal("100"), Decimal("50"), 44, "2024-01-10")
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


@patch("backend.src.api.global_baskets._get_latest_dieese_wage", return_value=None)
@patch("backend.src.api.global_baskets._get_latest_usa_basket_usd", return_value=None)
def test_get_global_baskets_without_brl_rate_returns_null_brl(mock_usa, mock_dieese, client, db_session):
    rates_rows = [("USD", Decimal("1"), "2024-01-01")]
    basket_rows = [
        (1, "Brazil", "IBGE", "BRL", Decimal("1000"), Decimal("200"), Decimal("100"), Decimal("50"), 44, "2024-01-10")
    ]
    db_session.execute.side_effect = [
        _result_with_rows(basket_rows),
        _result_with_rows(rates_rows),
    ]

    response = client.get("/api/global-baskets")
    assert response.status_code == 200
    data = response.json()

    assert data[0]["monthly_min_wage_brl"] is None
    assert data[0]["basket_cost_brl"] is None


@patch("backend.src.api.global_baskets._get_latest_dieese_wage", return_value=None)
@patch("backend.src.api.global_baskets._get_latest_usa_basket_usd", return_value=None)
def test_get_global_baskets_empty_returns_empty_list(mock_usa, mock_dieese, client, db_session):
    db_session.execute.side_effect = [
        _result_with_rows([]),
        _result_with_rows([]),
    ]
    response = client.get("/api/global-baskets")
    assert response.status_code == 200
    assert response.json() == []


@patch("backend.src.api.global_baskets._get_latest_dieese_wage", return_value=None)
@patch("backend.src.api.global_baskets._get_latest_usa_basket_usd", return_value=None)
def test_get_global_baskets_null_wage_fields(mock_usa, mock_dieese, client, db_session):
    """Rows with null USD amounts produce null brl/usd fields."""
    rates_rows = [("BRL", Decimal("0.2"), "2024-01-01")]
    basket_rows = [
        (2, "Germany", "Destatis", "EUR", Decimal("1500"), Decimal("300"), None, None, 40, "2024-01-10")
    ]
    db_session.execute.side_effect = [
        _result_with_rows(basket_rows),
        _result_with_rows(rates_rows),
    ]

    response = client.get("/api/global-baskets")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["monthly_min_wage_usd"] is None
    assert data[0]["basket_cost_usd"] is None
    assert data[0]["monthly_min_wage_brl"] is None
    assert data[0]["basket_cost_brl"] is None


# ── GET /api/global-baskets/dieese/wage ──────────────────────────────────────

@patch("backend.src.api.global_baskets._compute_dieese_item", return_value=None)
def test_dieese_wage_specific_month_no_items(mock_compute, client, db_session):
    """When all DIEESE items are None, returns zero basket value."""
    db_session.execute.return_value.scalar.return_value = 1
    wage_result = MagicMock()
    wage_result.fetchone.return_value = (Decimal("1412.00"),)
    db_session.execute.return_value = wage_result

    response = client.get("/api/global-baskets/dieese/wage?month_ref=2024-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["month_ref"] == "2024-01"
    assert float(data[0]["basket_value_brl"]) == 0.0


@patch("backend.src.api.global_baskets._compute_dieese_item")
def test_dieese_wage_calculates_total_and_percentage(mock_compute, client, db_session):
    """basket_value_brl is sum of qtd_month_price; percentage_of_wage is correct."""
    mock_compute.return_value = {"qtd_month_price": Decimal("50")}
    db_session.execute.return_value.scalar.return_value = 1

    wage_result = MagicMock()
    wage_result.fetchone.return_value = (Decimal("1000.00"),)
    db_session.execute.return_value = wage_result

    response = client.get("/api/global-baskets/dieese/wage?month_ref=2024-01")
    assert response.status_code == 200
    data = response.json()
    # 13 DIEESE items × 50 = 650
    assert float(data[0]["basket_value_brl"]) == pytest.approx(650.0)
    assert data[0]["percentage_of_wage"] == pytest.approx(65.0)


def test_dieese_wage_404_when_month_not_found(client, db_session):
    db_session.execute.return_value.scalar.return_value = 0
    response = client.get("/api/global-baskets/dieese/wage?month_ref=2099-01")
    assert response.status_code == 404


# ── GET /api/global-baskets/dieese/inflation/annual ─────────────────────────

@patch("backend.src.api.global_baskets._compute_dieese_monthly_totals")
@patch("backend.src.api.global_baskets._get_annual_ipca_pct", return_value=4.62)
def test_dieese_annual_inflation_empty_when_no_totals(mock_ipca, mock_totals, client, db_session):
    mock_totals.return_value = {}
    response = client.get("/api/global-baskets/dieese/inflation/annual")
    assert response.status_code == 200
    assert response.json() == []


@patch("backend.src.api.global_baskets._compute_dieese_monthly_totals")
@patch("backend.src.api.global_baskets._get_annual_ipca_pct", return_value=4.62)
def test_dieese_annual_inflation_calculates_year_over_year(mock_ipca, mock_totals, client, db_session):
    mock_totals.return_value = {
        "2022-12": Decimal("600"),
        "2023-12": Decimal("660"),
    }
    response = client.get("/api/global-baskets/dieese/inflation/annual")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["year"] == 2023
    assert data[0]["start_month_ref"] == "2022-12"
    assert data[0]["end_month_ref"] == "2023-12"
    assert data[0]["annual_inflation_pct"] == pytest.approx(10.0)
    assert data[0]["annual_ipca_pct"] == pytest.approx(4.62)


@patch("backend.src.api.global_baskets._compute_dieese_monthly_totals")
@patch("backend.src.api.global_baskets._get_annual_ipca_pct", return_value=None)
def test_dieese_annual_inflation_skips_year_without_previous_december(mock_ipca, mock_totals, client, db_session):
    """First year with no prior December should be skipped (no start_value)."""
    mock_totals.return_value = {
        "2022-12": Decimal("600"),
    }
    response = client.get("/api/global-baskets/dieese/inflation/annual")
    assert response.status_code == 200
    assert response.json() == []
