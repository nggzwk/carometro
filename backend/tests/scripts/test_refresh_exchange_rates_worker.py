from unittest.mock import MagicMock

from backend.scripts import refresh_exchange_rates_worker as worker


def test_worker_returns_zero_on_success(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)
    monkeypatch.setattr(worker, "refresh_exchange_rates", lambda database_url: 7)

    assert worker.main() == 0


def test_worker_returns_one_when_refresh_fails(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)
    monkeypatch.setattr(worker, "refresh_exchange_rates", lambda database_url: (_ for _ in ()).throw(RuntimeError("boom")))
    monkeypatch.setattr(worker.LOGGER, "exception", MagicMock())

    assert worker.main() == 1
    worker.LOGGER.exception.assert_called_once()
