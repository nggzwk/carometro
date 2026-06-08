from unittest.mock import MagicMock

from backend.scripts import refresh_exchange_rates_worker as worker


def test_worker_returns_zero_on_success(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)
    monkeypatch.setattr(worker, "refresh_all", lambda database_url: None)

    assert worker.main() == 0


def test_worker_returns_one_when_refresh_fails(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)
    monkeypatch.setattr(
        worker,
        "refresh_all",
        lambda database_url: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    monkeypatch.setattr(worker.LOGGER, "exception", MagicMock())

    assert worker.main() == 1
    worker.LOGGER.exception.assert_called_once()


def test_worker_returns_one_when_database_url_missing(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)

    assert worker.main() == 1


def test_worker_logs_error_when_database_url_missing(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(worker, "_load_env_file", lambda: None)
    mock_error = MagicMock()
    monkeypatch.setattr(worker.LOGGER, "error", mock_error)

    worker.main()
    mock_error.assert_called_once()
