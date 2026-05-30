from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from backend.scripts import calculate_dieese_basket as cdb


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
    ("dieese_unit", "item_unit", "expected"),
    [
        ("kg", "g", Decimal("1000")),
        ("g", "kg", Decimal("0.001")),
        ("L", "ml", Decimal("1000")),
        ("ml", "L", Decimal("0.001")),
        ("kg", "kg", Decimal("1")),
    ],
)
def test_unit_multiplier_handles_mass_and_volume_conversions(dieese_unit, item_unit, expected):
    assert cdb._unit_multiplier(dieese_unit, item_unit) == expected


def test_get_normalized_monthly_price_uses_fallback_item_when_primary_has_no_price():
    with patch.object(cdb, "_get_item_key") as get_item_key, patch.object(
        cdb, "_get_alternative_item_keys"
    ) as get_alternatives, patch.object(cdb, "_get_latest_median_price") as get_latest:
        get_item_key.side_effect = [
            (1, 10, 20, "2", "kg"),
            (3, 11, 21, "4", "kg"),
        ]
        get_alternatives.return_value = []
        get_latest.side_effect = [None, Decimal("40")]

        result = cdb.get_normalized_monthly_price(
            MagicMock(),
            1,
            "2026-04",
            fallback_item_id=3,
        )

        assert result == Decimal("10")


def test_get_dieese_month_value_returns_decimal_prices_and_previous_month_values():
    cursor_cm, cursor = _mock_cursor(fetchone_side_effect=[(1.23,)] * 13)
    conn = _mock_conn(cursor_cm)

    def normalized_price(_conn, _item_id, month_ref, _fallback_item_id=None):
        if month_ref == "2026-04":
            return Decimal("10")
        if month_ref == "2026-03":
            return Decimal("8")
        return Decimal("10")

    with patch.object(cdb, "_get_default_basket_item_id", return_value=101), patch.object(
        cdb, "_find_item_id_for_subcat", return_value=101
    ), patch.object(cdb, "_get_item_key", return_value=(101, 1, 1, "1", "kg")), patch.object(
        cdb, "get_normalized_monthly_price", side_effect=normalized_price
    ), patch.object(cdb, "_unit_multiplier", return_value=Decimal("1")):
        rows = cdb.get_dieese_month_value(conn, "2026-04")

    assert len(rows) == 13
    assert rows[0]["item_name"] == "Carne"
    assert isinstance(rows[0]["month_price"], Decimal)
    assert isinstance(rows[0]["previous_price"], Decimal)
    assert rows[0]["month_price"] == Decimal("66.0")
    assert rows[0]["previous_price"] == Decimal("52.8")
    assert rows[0]["mom_pct"] == 25.0
    assert rows[0]["ipca_monthly_pct"] == 1.23
    assert cursor.fetchone.call_count == 13


def test_calculate_and_store_dieese_values_sums_exact_decimals_and_persists_total():
    conn_cm = MagicMock()
    conn = MagicMock()
    conn_cm.__enter__.return_value = conn
    conn_cm.__exit__.return_value = None

    cursor_cm, cursor = _mock_cursor(fetchone_side_effect=[(7,)], fetchall_side_effect=[[("2026-04",)]])
    conn.cursor.return_value = cursor_cm

    with patch.object(cdb.psycopg, "connect", return_value=conn_cm), patch.object(
        cdb, "get_dieese_month_value",
        return_value=[
            {"month_price": Decimal("1.005")},
            {"month_price": Decimal("2.005")},
        ],
    ), patch.object(cdb, "datetime") as mock_datetime:
        mock_datetime.now.return_value = MagicMock()
        mock_datetime.timezone = cdb.timezone

        cdb.calculate_and_store_dieese_values("postgresql://example", "2026-04")

    cursor.execute.assert_any_call(
        "SELECT id FROM inflacao_brasil.basket WHERE code = 'dieese_basket'"
    )
    assert cursor.execute.call_count >= 2

    insert_call = conn.cursor.return_value.__enter__.return_value.execute.call_args_list[-1]
    assert insert_call.args[0].strip().startswith("INSERT INTO inflacao_brasil.basket_monthly_value")
    assert insert_call.args[1][2] == 3.01