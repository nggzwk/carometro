from __future__ import annotations

import sys
from pathlib import Path

import uvicorn

# Add parent directory to path so backend module can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))


def main() -> None:
	uvicorn.run("backend.src.api.app:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
	main()
