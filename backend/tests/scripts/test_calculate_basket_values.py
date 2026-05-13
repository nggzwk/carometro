from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from backend.scripts import calculate_basket_values as cbv


def _mock_cursor(fetchone_side_effect=None, fetchall_side_effect=None):
    cursor = MagicMock()
    if fetchone_side_effect is not None:
        cursor.fetchone.side_effect = fetchone_side_effect
    if fetchall_side_effect is not None:
        cursor.fetchall.side_effect = fetchall_side_effect

    cursor_cm = MagicMock()
    cursor_cm.__enter__.return_value = cursor
    cursor_cm.__exit__.return_value = None
    return cursor_cm, cursor


def _mock_conn(cursor_cm):
    conn = MagicMock()
    conn.cursor.return_value = cursor_cm
    return conn


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("1,5", Decimal("1.5")),
        ("2", Decimal("2")),
        ("x", None),
        (None, None),
    ],
)
def test_parse_pack_size(value, expected):
    assert cbv._parse_pack_size(value) == expected


def test_get_basket_items_returns_none_when_empty():
    cursor_cm, _ = _mock_cursor(fetchall_side_effect=[[]])
    conn = _mock_conn(cursor_cm)

    assert cbv.get_basket_items(conn) is None


def test_get_basket_items_returns_rows():
    rows = [(1, 10, 20, "1", "kg", Decimal("2"), None)]
    cursor_cm, _ = _mock_cursor(fetchall_side_effect=[rows])
    conn = _mock_conn(cursor_cm)

    assert cbv.get_basket_items(conn) == rows


def test_get_latest_median_price_returns_decimal():
    cursor_cm, _ = _mock_cursor(fetchone_side_effect=[(12.34,)])
    conn = _mock_conn(cursor_cm)

    assert cbv._get_latest_median_price(conn, 1, "2024-01") == Decimal("12.34")


def test_get_normalized_monthly_price_uses_first_valid_candidate():
    with patch.object(cbv, "_get_item_key") as get_item_key, \
        patch.object(cbv, "_get_alternative_item_keys") as get_alternatives, \
        patch.object(cbv, "_get_latest_median_price") as get_latest:

        get_item_key.return_value = (1, 10, 20, "2", "kg")
        get_alternatives.return_value = [(2, 10, 20, "1", "kg")]
        get_latest.side_effect = [None, Decimal("10")]

        with pytest.raises(ValueError):
            cbv.get_normalized_monthly_price(MagicMock(), 1, "2024-01")


def test_get_normalized_monthly_price_uses_fallback_item():
    with patch.object(cbv, "_get_item_key") as get_item_key, \
        patch.object(cbv, "_get_alternative_item_keys") as get_alternatives, \
        patch.object(cbv, "_get_latest_median_price") as get_latest:

        get_item_key.side_effect = [
            (1, 10, 20, "2", "kg"),
            (3, 11, 21, "4", "kg"),
        ]
        get_alternatives.return_value = []
        get_latest.side_effect = [None, Decimal("40")]

        with pytest.raises(ValueError):
            cbv.get_normalized_monthly_price(
                MagicMock(),
                1,
                "2024-01",
                fallback_item_id=3,
            )


def test_get_basket_value_sums_weighted_items():
    basket_items = [
        (1, 0, 0, "1", "kg", Decimal("2"), None),
        (2, 0, 0, "1", "kg", Decimal("1"), None),
        (3, 0, 0, "1", "kg", Decimal("0.5"), None),
    ]

    with patch.object(cbv, "get_normalized_monthly_price") as get_price:
        get_price.side_effect = [Decimal("2"), None, Decimal("3")]
        assert cbv.get_basket_value(MagicMock(), "2024-01", basket_items) == Decimal(
            "5.5"
        )


def test_get_basket_value_returns_none_when_no_prices():
    basket_items = [(1, 0, 0, "1", "kg", Decimal("1"), None)]

    with patch.object(cbv, "get_normalized_monthly_price", return_value=None):
        assert cbv.get_basket_value(MagicMock(), "2024-01", basket_items) is None


def test_get_minimum_wage_for_month_returns_decimal():
    cursor_cm, _ = _mock_cursor(fetchone_side_effect=[(1302,)])
    conn = _mock_conn(cursor_cm)

    assert cbv.get_minimum_wage_for_month(conn, "2023-05") == Decimal("1302")