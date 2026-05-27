import io
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from backend.scripts import update_exchange_rates as uer


def test_build_api_url_defaults_to_exchangerate_api(monkeypatch):
    monkeypatch.delenv("EXCHANGE_RATE_API_URL", raising=False)
    monkeypatch.setenv("EXCHANGE_RATE_API_KEY", "test-key")

    assert (
        uer._build_api_url()
        == f"{uer.EXCHANGE_RATE_API_BASE}/test-key/latest/USD"
    )


def test_build_api_url_replaces_template(monkeypatch):
    monkeypatch.setenv(
        "EXCHANGE_RATE_API_URL",
        "https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD",
    )
    monkeypatch.setenv("EXCHANGE_RATE_API_KEY", "abc123")

    assert (
        uer._build_api_url()
        == "https://v6.exchangerate-api.com/v6/abc123/latest/USD"
    )


def test_build_api_url_appends_openexchange_app_id(monkeypatch):
    monkeypatch.setenv(
        "EXCHANGE_RATE_API_URL",
        "https://openexchangerates.org/api/latest.json?base=USD",
    )
    monkeypatch.setenv("EXCHANGE_RATE_API_KEY", "app-key")

    assert uer._build_api_url().endswith("app_id=app-key")


def test_fetch_rates_reads_conversion_rates():
    payload = {
        "base_code": "USD",
        "conversion_rates": {"USD": 1, "BRL": 5.0},
    }
    response = io.StringIO(json.dumps(payload))
    context = MagicMock()
    context.__enter__.return_value = response
    context.__exit__.return_value = None

    with patch.object(uer, "urlopen", return_value=context):
        base, rates = uer._fetch_rates("http://example.com")

    assert base == "USD"
    assert rates == {"USD": Decimal("1"), "BRL": Decimal("5.0")}


def test_rate_to_usd_uses_base_usd():
    rates = {"BRL": Decimal("5")}

    assert uer._rate_to_usd("USD", rates, "BRL") == Decimal("0.2")


def test_main_returns_error_when_database_url_missing(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("EXCHANGE_RATE_API_KEY", "test-key")
    monkeypatch.setattr(uer, "_load_env_file", lambda: None)

    assert uer.main() == 1
