#!/usr/bin/env python3
"""Scheduled exchange-rate refresh worker.

Run this from cron once a week, preferably after the quotation window closes,
so the API never fetches rates during HTTP requests. Example:

        0 19 * * 1 /Users/naranascimento/Projects/inflacao-brasil/.venv/bin/python \
            /Users/naranascimento/Projects/inflacao-brasil/backend/scripts/refresh_exchange_rates_worker.py
"""

from __future__ import annotations

import logging
import os

from backend.scripts.update_exchange_rates import _load_env_file, refresh_exchange_rates

LOGGER = logging.getLogger(__name__)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    _load_env_file()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        LOGGER.error("DATABASE_URL is not set")
        return 1

    try:
        updated = refresh_exchange_rates(database_url)
    except Exception:
        LOGGER.exception("ALERT: failed to refresh exchange rates")
        return 1

    LOGGER.info("Exchange rate refresh completed; updated %s currency rates", updated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
