"""Tests for calculate_vegetable_basket.py script."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from backend.scripts import calculate_vegetable_basket as cvb


@pytest.fixture
def conn():
    return MagicMock()


def _make_cursor(conn, fetchone=None, fetchall=None):
    cur = MagicMock()
    cur.fetchone.return_value = fetchone
    cur.fetchall.return_value = fetchall or []
    conn.cursor.return_value.__enter__.return_value = cur
    return cur


def test_load_veggie_items_returns_rows(conn):
    _make_cursor(conn, fetchall=[
        (50008, 50009, "KG"),
        (50025, 50024, "KG"),
        (50005, None,  "KG"),
    ])
    items = cvb._load_veggie_items(conn)
    assert len(items) == 3
    assert items[0] == (50008, 50009, "KG")
    assert items[2] == (50005, None, "KG")


def test_load_veggie_items_empty_table(conn):
    _make_cursor(conn, fetchall=[])
    assert cvb._load_veggie_items(conn) == []



def test_item_id_for_subcat_found(conn):
    _make_cursor(conn, fetchone=(38,))
    result = cvb._item_id_for_subcat(conn, 50008, "KG")
    assert result == 38


def test_item_id_for_subcat_not_found(conn):
    _make_cursor(conn, fetchone=None)
    result = cvb._item_id_for_subcat(conn, 99999, "KG")
    assert result is None



def test_latest_median_price_found(conn):
    _make_cursor(conn, fetchone=(Decimal("8.75"),))
    result = cvb._latest_median_price(conn, 38, "2026-04")
    assert result == Decimal("8.75")


def test_latest_median_price_none_when_no_row(conn):
    _make_cursor(conn, fetchone=None)
    assert cvb._latest_median_price(conn, 38, "2026-04") is None


def test_latest_median_price_none_when_value_is_null(conn):
    _make_cursor(conn, fetchone=(None,))
    assert cvb._latest_median_price(conn, 38, "2026-04") is None



def test_unit_price_returns_primary(conn):
    with (
        patch.object(cvb, "_item_id_for_subcat", return_value=38),
        patch.object(cvb, "_latest_median_price", return_value=Decimal("8.75")),
    ):
        result = cvb._unit_price(conn, 50008, 50009, "KG", "2026-04")
    assert result == Decimal("8.75")


def test_unit_price_falls_back_when_primary_missing(conn):
    primary_prices = {38: None, 196: Decimal("7.50")}

    def mock_id(c, subcat, unit):
        return 38 if subcat == 50008 else 196

    def mock_price(c, item_id, month_ref):
        return primary_prices[item_id]

    with (
        patch.object(cvb, "_item_id_for_subcat", side_effect=mock_id),
        patch.object(cvb, "_latest_median_price", side_effect=mock_price),
    ):
        result = cvb._unit_price(conn, 50008, 50009, "KG", "2026-04")

    assert result == Decimal("7.50")


def test_unit_price_returns_none_when_both_missing(conn):
    with (
        patch.object(cvb, "_item_id_for_subcat", return_value=38),
        patch.object(cvb, "_latest_median_price", return_value=None),
    ):
        result = cvb._unit_price(conn, 50008, 50009, "KG", "2026-04")
    assert result is None


def test_unit_price_no_fallback_subcategory(conn):
    with (
        patch.object(cvb, "_item_id_for_subcat", return_value=39),
        patch.object(cvb, "_latest_median_price", return_value=Decimal("5.79")),
    ):
        result = cvb._unit_price(conn, 50005, None, "KG", "2026-04")
    assert result == Decimal("5.79")


def test_unit_price_primary_id_none_goes_straight_to_fallback(conn):
    def mock_id(c, subcat, unit):
        return None if subcat == 50079 else 16

    def mock_price(c, item_id, month_ref):
        return Decimal("3.37")

    with (
        patch.object(cvb, "_item_id_for_subcat", side_effect=mock_id),
        patch.object(cvb, "_latest_median_price", side_effect=mock_price),
    ):
        result = cvb._unit_price(conn, 50079, 50080, "PC/UN", "2026-04")

    assert result == Decimal("3.37")


def test_minimum_wage_found(conn):
    _make_cursor(conn, fetchone=(Decimal("1620.00"),))
    result = cvb._minimum_wage(conn, "2026-04")
    assert result == Decimal("1620.00")


def test_minimum_wage_none_when_no_row(conn):
    _make_cursor(conn, fetchone=None)
    assert cvb._minimum_wage(conn, "2026-04") is None



def test_basket_value_sums_all_items(conn):
    items = [(50008, 50009, "KG"), (50005, None, "KG")]

    prices = {50008: Decimal("8.75"), 50005: Decimal("5.79")}

    def mock_unit_price(c, primary, fallback, unit, month_ref):
        return prices.get(primary)

    with patch.object(cvb, "_unit_price", side_effect=mock_unit_price):
        result = cvb._basket_value(conn, items, "2026-04")

    assert result == Decimal("14.54")


def test_basket_value_skips_items_without_price(conn):
    items = [(50008, 50009, "KG"), (50099, None, "KG")]

    def mock_unit_price(c, primary, fallback, unit, month_ref):
        return Decimal("8.75") if primary == 50008 else None

    with patch.object(cvb, "_unit_price", side_effect=mock_unit_price):
        result = cvb._basket_value(conn, items, "2026-04")

    assert result == Decimal("8.75")


def test_basket_value_returns_none_when_no_prices(conn):
    items = [(50099, None, "KG"), (50098, None, "KG")]

    with patch.object(cvb, "_unit_price", return_value=None):
        result = cvb._basket_value(conn, items, "2026-04")

    assert result is None



def test_calculate_and_store_processes_months(monkeypatch):
    items = [(50008, 50009, "KG"), (50005, None, "KG")]
    months = ["2026-03", "2026-04"]

    mock_conn = MagicMock()

    months_cursor = MagicMock()
    months_cursor.fetchall.return_value = [(m,) for m in months]

    generic_cursor = MagicMock()
    generic_cursor.fetchall.return_value = items

    mock_conn.cursor.return_value.__enter__.return_value = generic_cursor

    with (
        patch.object(cvb, "_load_veggie_items", return_value=items),
        patch.object(cvb, "_basket_value", return_value=Decimal("60.88")),
        patch.object(cvb, "_minimum_wage", return_value=Decimal("1620.00")),
        patch("psycopg.connect") as mock_connect,
    ):
        ctx = MagicMock()
        ctx.__enter__.return_value = mock_conn
        mock_connect.return_value = ctx

        month_cursor = MagicMock()
        month_cursor.fetchall.return_value = [(m,) for m in months]
        mock_conn.cursor.return_value.__enter__.return_value = month_cursor

        cvb.calculate_and_store("postgresql://test/db")

    assert mock_conn.commit.call_count == len(months)


def test_calculate_and_store_skips_when_no_items(monkeypatch, capsys):
    with (
        patch.object(cvb, "_load_veggie_items", return_value=[]),
        patch("psycopg.connect") as mock_connect,
    ):
        ctx = MagicMock()
        ctx.__enter__.return_value = MagicMock()
        mock_connect.return_value = ctx

        cvb.calculate_and_store("postgresql://test/db")

    captured = capsys.readouterr()
    assert "aborting" in captured.out


def test_calculate_and_store_skips_month_with_no_price(monkeypatch, capsys):
    items = [(50008, 50009, "KG")]

    mock_conn = MagicMock()
    month_cursor = MagicMock()
    month_cursor.fetchall.return_value = [("2026-04",)]
    mock_conn.cursor.return_value.__enter__.return_value = month_cursor

    with (
        patch.object(cvb, "_load_veggie_items", return_value=items),
        patch.object(cvb, "_basket_value", return_value=None),
        patch("psycopg.connect") as mock_connect,
    ):
        ctx = MagicMock()
        ctx.__enter__.return_value = mock_conn
        mock_connect.return_value = ctx

        cvb.calculate_and_store("postgresql://test/db")

    captured = capsys.readouterr()
    assert "skipped" in captured.out
    mock_conn.commit.assert_not_called()


def test_calculate_and_store_single_month_arg(monkeypatch):
    items = [(50008, 50009, "KG")]
    mock_conn = MagicMock()

    with (
        patch.object(cvb, "_load_veggie_items", return_value=items),
        patch.object(cvb, "_basket_value", return_value=Decimal("60.88")),
        patch.object(cvb, "_minimum_wage", return_value=Decimal("1620.00")),
        patch("psycopg.connect") as mock_connect,
    ):
        ctx = MagicMock()
        ctx.__enter__.return_value = mock_conn
        mock_connect.return_value = ctx

        cvb.calculate_and_store("postgresql://test/db", month_ref="2026-04")

    assert mock_conn.commit.call_count == 1


def test_calculate_and_store_percentage_when_no_wage(monkeypatch, capsys):
    """If wage is None, percentage_of_wage should not crash."""
    items = [(50008, 50009, "KG")]
    mock_conn = MagicMock()

    with (
        patch.object(cvb, "_load_veggie_items", return_value=items),
        patch.object(cvb, "_basket_value", return_value=Decimal("60.88")),
        patch.object(cvb, "_minimum_wage", return_value=None),
        patch("psycopg.connect") as mock_connect,
    ):
        ctx = MagicMock()
        ctx.__enter__.return_value = mock_conn
        mock_connect.return_value = ctx

        cvb.calculate_and_store("postgresql://test/db", month_ref="2026-04")

    assert mock_conn.commit.call_count == 1
