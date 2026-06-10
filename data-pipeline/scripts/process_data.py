#!/usr/bin/env python3
"""Unified data pipeline CLI for download and processing."""

import argparse
import sys
from csv_utils import print_results_summary, print_section
from pipeline_core import (
    CLEANED_DIR,
    DATASETS,
    RAW_DIR,
    download_all,
    download_dataset,
    process_all,
    process_dataset,
)


# Convenience aliases that fan a single --dataset value out to several datasets.
DATASET_GROUPS: dict[str, list[str]] = {
    "old_2022_2024": ["old_portal", "cotacoes_old"],
    "old_legacy_2022_2023": ["old_portal"],
    "old_cotacoes_2023_2024": ["cotacoes_old"],
    "new_cotacoes_2025_plus": ["cotacoes_new"],
}


def _resolve_datasets(dataset: str) -> list[str]:
    if dataset == "all":
        return list(DATASETS.keys())
    if dataset in DATASET_GROUPS:
        return DATASET_GROUPS[dataset]
    return [dataset]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inflação Brasil data pipeline")
    parser.add_argument(
        "action",
        nargs="?",
        default="process",
        choices=["process", "download", "all"],
        help="Action to run (default: process)",
    )
    parser.add_argument(
        "--dataset",
        default="all",
        choices=["all", *DATASETS.keys(), *DATASET_GROUPS.keys()],
        help="Dataset (or dataset group) to target (default: all)",
    )
    return parser


def run_process(dataset: str) -> int:
    if dataset == "all":
        return print_results_summary("PROCESS SUMMARY", process_all())
    results = {key: process_dataset(key) for key in _resolve_datasets(dataset)}
    return print_results_summary("PROCESS SUMMARY", results)


def run_download(dataset: str) -> int:
    if dataset == "all":
        return print_results_summary("DOWNLOAD SUMMARY", download_all())
    results = {key: download_dataset(key) for key in _resolve_datasets(dataset)}
    return print_results_summary("DOWNLOAD SUMMARY", results)


def run_all(dataset: str) -> int:
    download_code = run_download(dataset)
    process_code = run_process(dataset)
    return 0 if download_code == 0 and process_code == 0 else 1


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)

    print_section("INFLAÇÃO BRASIL - DATA PIPELINE")
    print(f"Raw data dir:     {RAW_DIR}")
    print(f"Cleaned data dir: {CLEANED_DIR}")

    handlers = {
        "process": run_process,
        "download": run_download,
        "all": run_all,
    }
    return handlers[args.action](args.dataset)


if __name__ == "__main__":
    sys.exit(main())
