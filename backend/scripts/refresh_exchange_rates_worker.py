#!/usr/bin/env python3
"""Scheduled weekly worker for exchange rates, USA CPI, and Argentina SMVM.

Cron example (every Monday at 19:00):
    0 19 * * 1 /path/to/.venv/bin/python \
        /path/to/backend/scripts/refresh_exchange_rates_worker.py
"""

from __future__ import annotations

import logging
import os

from backend.scripts.update_exchange_rates import _load_env_file, refresh_all

LOGGER = logging.getLogger(__name__)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    _load_env_file()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        LOGGER.error("DATABASE_URL is not set")
        return 1

    try:
        refresh_all(database_url)
    except Exception:
        LOGGER.exception("ALERT: weekly refresh failed")
        return 1

    LOGGER.info("Weekly refresh completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
