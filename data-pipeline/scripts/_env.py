"""Minimal .env loader (stdlib only).

The calculate_* scripts read connection settings from the process environment
(DATABASE_URL, etc.). In production these are injected by the platform; locally
they live in the repo-root .env. Importing this module populates os.environ from
that file so the scripts work in a fresh shell without `source`-ing anything.

Existing environment variables always win, so platform-provided values are never
overridden.
"""

from __future__ import annotations

import os
from pathlib import Path

_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


def load_env(path: Path = _ROOT_ENV) -> None:
    """Load KEY=VALUE lines from `path` into os.environ (without overriding)."""
    if not path.is_file():
        return

    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        # Strip surrounding quotes if present.
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env()
