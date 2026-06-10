#!/usr/bin/env python3
"""Standardize cleaned CSV files: split marca, backfill units, and categorize
produtos using a rules JSON.

Usage (single file):
    python standardize.py --input ../../data/cleaned/old_format/cleaned_2022-07-31.csv \
                          --output ../../data/standardized

Usage (full directory):
    python standardize.py --input ../../data/cleaned/new_format \
                          --output ../../data/standardized
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

import pandas as pd


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

UNITS_TO_REMOVE_IN_PRODUTO = ("KG", "ML", "LITRO")


# ---------------------------------------------------------------------------
# Produto / marca splitting
# ---------------------------------------------------------------------------

def clean_produto_units(produto: str) -> str:
    """Remove quantity+unit suffixes from a produto string (e.g. '500ML', '1KG')."""
    if pd.isna(produto):
        return ""
    text = str(produto)
    units_pattern = "|".join(re.escape(unit) for unit in UNITS_TO_REMOVE_IN_PRODUTO)
    text = re.sub(rf"\b\d+(?:[\.,]\d+)?\s*(?:{units_pattern})\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(rf"\b(?:{units_pattern})\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_produto_marca(produto: str) -> tuple[str, str]:
    """Split 'PRODUTO - MARCA' into (produto, marca). Used for new-format files."""
    if pd.isna(produto):
        return "", ""
    text = re.sub(r"\s+", " ", clean_produto_units(produto)).strip()
    if not text:
        return "", ""
    parts = re.split(r"\s*-\s*", text, maxsplit=1)
    if len(parts) == 2 and parts[1].strip():
        return parts[0].strip(), parts[1].strip()
    text = re.sub(r"\s*-\s*$", "", text).strip()
    return text, ""


def split_produto_marca_old_format(produto: str) -> tuple[str, str]:
    """Split old-format produto strings where CERVEJA/REFRIGERANTE precede the marca."""
    if pd.isna(produto):
        return "", ""
    text = re.sub(r"\s+", " ", clean_produto_units(produto)).strip()
    if not text:
        return "", ""
    match = re.search(r"^(.*?\b(?:CERVEJA|REFRIGERANTE)\b)(?:\s+(.+))?$", text, flags=re.IGNORECASE)
    if not match:
        return text, ""
    produto_base = re.sub(r"\s+", " ", match.group(1)).strip(" -")
    marca = re.sub(r"\s+", " ", match.group(2) or "").strip(" -")
    return produto_base, marca


def add_marca_column(
    df: pd.DataFrame,
    produto_column: str = "produto",
    preco_column: str = "preco",
    marca_column: str = "marca",
    use_old_format_rules: bool = True,
) -> pd.DataFrame:
    """Add a 'marca' column by splitting the produto string.

    Inserts the new column right before 'preco' (or after 'produto' if preco
    is absent). The produto column is updated in-place with the clean name.
    """
    if produto_column not in df.columns:
        return df

    split_fn = split_produto_marca_old_format if use_old_format_rules else split_produto_marca
    updated = df.copy()
    produto_marca_pairs = updated[produto_column].map(split_fn)
    updated[produto_column] = produto_marca_pairs.map(lambda pair: pair[0])
    marca_series = produto_marca_pairs.map(lambda pair: pair[1])

    if marca_column in updated.columns:
        updated = updated.drop(columns=[marca_column])

    insert_idx = (
        updated.columns.get_loc(preco_column)
        if preco_column in updated.columns
        else updated.columns.get_loc(produto_column) + 1
    )
    updated.insert(insert_idx, marca_column, marca_series)
    return updated


# ---------------------------------------------------------------------------
# Categorization helpers
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Category:
    id: int
    name: str
    items: list[str]


def _normalize(text: str) -> str:
    text = str(text or "").strip().upper()
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[^A-Z0-9/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _token_set(text: str) -> set[str]:
    return {token for token in _normalize(text).split(" ") if len(token) > 1}


def _load_categories(path: Path) -> list[Category]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return [
        Category(id=int(row["id"]), name=str(row["name"]), items=[str(i) for i in row.get("items", [])])
        for row in payload.get("categories", [])
    ]


def _build_item_index(categories: list[Category]) -> dict[str, tuple[Category, str]]:
    return {_normalize(item): (category, item) for category in categories for item in category.items}


def _load_subcategory_indexes(
    path: Path,
) -> tuple[dict[int, dict[str, tuple[Category, str]]], dict[int, int]]:
    if not path.exists():
        return {}, {}

    payload = json.loads(path.read_text(encoding="utf-8"))
    by_category: dict[int, list[Category]] = {}
    fallback_by_category: dict[int, int] = {}

    for row in payload.get("subcategories", []):
        subcategory = Category(
            id=int(row["id"]),
            name=str(row["name"]),
            items=[str(i) for i in row.get("items", [])],
        )
        category_id = int(row["category_id"])
        by_category.setdefault(category_id, []).append(subcategory)
        if not subcategory.items or _normalize(subcategory.name).startswith("OUTROS"):
            fallback_by_category[category_id] = subcategory.id

    indexes: dict[int, dict[str, tuple[Category, str]]] = {}
    for category_id, subcategories in by_category.items():
        index = _build_item_index(subcategories)
        for subcategory in subcategories:
            name_key = _normalize(subcategory.name)
            if name_key and name_key not in index:
                index[name_key] = (subcategory, subcategory.name)
        indexes[category_id] = index

    return indexes, fallback_by_category


_QTY_UNIT_RE = re.compile(
    r"^[\s\-]*(?P<qty>\d+(?:[.,]\d+)?)?\s*(?P<unit>[A-Za-z][A-Za-z/]*)\.?\s*$"
)


def _parse_qty_unit(text: str) -> tuple[str, str] | None:
    """Parse a quantity+unit string (e.g. '1 PC/UN', '- 1L') into (qty, unit).

    Returns None when the text is too long to be a unit (i.e. it's a brand name).
    """
    match = _QTY_UNIT_RE.match(text or "")
    if match is None:
        return None
    unit = match.group("unit")
    if len(unit) > 5:
        return None
    qty = (match.group("qty") or "1").replace(",", ".")
    return qty, unit.upper()


def _backfill_units_from_marca(
    df: pd.DataFrame,
    marca_column: str = "marca",
    qtd_column: str = "qtd_embalagem",
    unidade_column: str = "unidade_sigla",
) -> pd.DataFrame:
    """Move qty/unit from marca into the unit columns when the unit fields are empty.

    This fixes rows where the unit was embedded in the produto name after a hyphen
    (e.g. 'ALFACE CRESPA -1 PC/UN'), which split_produto_marca misclassifies as
    the marca, leaving qtd_embalagem/unidade_sigla empty.
    """
    if not {marca_column, qtd_column, unidade_column}.issubset(df.columns):
        return df
    for idx in df.index:
        if str(df.at[idx, qtd_column] or "").strip() and str(df.at[idx, unidade_column] or "").strip():
            continue
        parsed = _parse_qty_unit(str(df.at[idx, marca_column] or "").strip())
        if parsed is None:
            continue
        df.at[idx, qtd_column], df.at[idx, unidade_column] = parsed
        df.at[idx, marca_column] = ""
    return df


def _best_rule_match(
    produto: str, item_index: dict[str, tuple[Category, str]]
) -> tuple[Category | None, str, float]:
    normalized = _normalize(produto)
    if not normalized:
        return None, "empty", 0.0

    exact = item_index.get(normalized)
    if exact is not None:
        return exact[0], "rule_exact", 1.0

    best_category: Category | None = None
    best_score = 0.0
    for item_norm, (category, _) in item_index.items():
        score = SequenceMatcher(None, normalized, item_norm).ratio()
        if score > best_score:
            best_score = score
            best_category = category

    if best_category is not None and best_score >= 0.90:
        return best_category, "rule_fuzzy", float(best_score)

    produto_tokens = _token_set(produto)
    if not produto_tokens:
        return None, "no_tokens", 0.0

    by_overlap: dict[int, float] = {}
    by_category: dict[int, Category] = {}
    for item_norm, (category, _) in item_index.items():
        item_tokens = set(item_norm.split(" "))
        if not item_tokens:
            continue
        overlap = len(produto_tokens.intersection(item_tokens)) / max(len(produto_tokens), 1)
        if overlap > by_overlap.get(category.id, 0.0):
            by_overlap[category.id] = overlap
            by_category[category.id] = category

    if by_overlap:
        category_id, score = max(by_overlap.items(), key=lambda pair: pair[1])
        if score >= 0.55:
            return by_category[category_id], "rule_keyword", float(score)

    return None, "unmatched", 0.0


def _best_subcategory_based_category(
    produto: str,
    subcategory_indexes: dict[int, dict[str, tuple[Category, str]]],
) -> tuple[int | None, str, float]:
    method_rank = {"rule_exact": 3, "rule_fuzzy": 2, "rule_keyword": 1}
    best_category_id: int | None = None
    best_method = "unmatched"
    best_score = 0.0
    best_rank = 0

    for category_id, sub_index in subcategory_indexes.items():
        if not sub_index:
            continue
        matched_subcategory, method, score = _best_rule_match(produto, sub_index)
        if matched_subcategory is None:
            continue
        rank = method_rank.get(method, 0)
        if rank > best_rank or (rank == best_rank and score > best_score):
            best_rank = rank
            best_score = score
            best_method = f"subcategory_{method}"
            best_category_id = category_id

    if best_category_id is None:
        return None, "unmatched", 0.0
    return best_category_id, best_method, best_score


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def categorize_file(
    input_path: Path,
    output_path: Path,
    rules_path: Path,
    subcategories_rules_path: Path,
    produto_column: str,
) -> None:
    """Categorize a single cleaned CSV file and save it to output_path."""
    use_old_format_rules = "cleaned/old_format" in str(input_path).replace("\\", "/").lower()

    categories = _load_categories(rules_path)
    item_index = _build_item_index(categories)
    subcategory_indexes, fallback_subcategory_by_category = _load_subcategory_indexes(subcategories_rules_path)

    sep = _detect_csv_separator(input_path)
    df = pd.read_csv(input_path, sep=sep, dtype=str).fillna("")
    if produto_column not in df.columns:
        raise ValueError(f"Column not found: {produto_column}")

    df = add_marca_column(df, produto_column=produto_column, preco_column="preco",
                          marca_column="marca", use_old_format_rules=use_old_format_rules)
    df = _backfill_units_from_marca(df)
    df[produto_column] = df[produto_column].map(clean_produto_units)

    unique_produtos = sorted(set(df[produto_column].astype(str).str.strip()))
    mapping: dict[str, tuple[int | None, str, float]] = {}

    for produto in unique_produtos:
        category, method, score = _best_rule_match(produto, item_index)
        if category is not None:
            mapping[produto] = (category.id, method, score)
            continue
        inferred_id, inferred_method, inferred_score = _best_subcategory_based_category(
            produto, subcategory_indexes
        )
        mapping[produto] = (inferred_id, inferred_method, inferred_score) if inferred_id is not None else (None, method, score)

    subcategory_mapping: dict[str, int | None] = {}
    produto_overrides: dict[str, str] = {}
    for produto in unique_produtos:
        category_id = mapping.get(produto, (None, "", 0.0))[0]
        if category_id is None:
            subcategory_mapping[produto] = None
            continue
        index_for_category = subcategory_indexes.get(int(category_id), {})
        fallback_subcategory = fallback_subcategory_by_category.get(int(category_id))
        if not index_for_category:
            subcategory_mapping[produto] = fallback_subcategory
            continue
        matched_subcategory, _, _ = _best_rule_match(produto, index_for_category)
        if matched_subcategory is not None:
            subcategory_mapping[produto] = matched_subcategory.id
            if matched_subcategory.id == 30001:
                produto_overrides[produto] = "LEITE INTEGRAL"
        else:
            subcategory_mapping[produto] = fallback_subcategory

    df["categoria_score"] = df[produto_column].map(lambda p: mapping.get(str(p).strip(), (None, "", 0.0))[2])
    df["produto_categoria"] = df[produto_column].map(lambda p: mapping.get(str(p).strip(), (None, "", 0.0))[0])
    df["produto_categoria"] = pd.to_numeric(df["produto_categoria"], errors="coerce").astype("Int64")
    df["produto_subcategoria"] = df[produto_column].map(lambda p: subcategory_mapping.get(str(p).strip()))
    df["produto_subcategoria"] = pd.to_numeric(df["produto_subcategoria"], errors="coerce").astype("Int64")
    if produto_overrides:
        df[produto_column] = df[produto_column].map(lambda p: produto_overrides.get(str(p).strip(), str(p).strip()))

    for col in [c for c in ["codigo_categoria", "id_produto"] if c in df.columns]:
        df = df.drop(columns=[col])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, sep=sep)

    total = len(df)
    matched = int(df["produto_categoria"].notna().sum())
    print(f"Rows: {total}")
    print(f"Categorized: {matched}")
    print(f"Uncategorized: {total - matched}")


# ---------------------------------------------------------------------------
# CLI helpers
# ---------------------------------------------------------------------------

def _detect_csv_separator(path: Path) -> str:
    try:
        sample = path.read_text(encoding="latin-1", errors="ignore")[:4096]
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        return dialect.delimiter
    except Exception:
        return ";" if ";" in path.name else ","


def _standardized_filename_from_input(input_path: Path) -> str:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", input_path.name)
    return f"standardized_{match.group(1)}.csv" if match else f"standardized_{input_path.stem}.csv"


def _build_jobs(input_path: Path, output_path: Path) -> list[tuple[Path, Path]]:
    if input_path.is_file():
        if output_path.exists() and output_path.is_dir():
            return [(input_path, output_path / _standardized_filename_from_input(input_path))]
        return [(input_path, output_path)]
    if not input_path.is_dir():
        raise ValueError(f"Input path not found: {input_path}")
    if output_path.exists() and output_path.is_file():
        raise ValueError("When input is a directory, output must be a directory path")
    output_path.mkdir(parents=True, exist_ok=True)
    return [(f, output_path / _standardized_filename_from_input(f)) for f in sorted(input_path.glob("*.csv"))]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Categorize CSV produtos using rules_v1.json")
    parser.add_argument("--input", required=True, type=Path, help="Input CSV file or directory path")
    parser.add_argument("--output", required=True, type=Path, help="Output CSV file or directory path")
    parser.add_argument("--rules", default=Path(__file__).with_name("rules_v1.json"), type=Path)
    parser.add_argument("--subcategories-rules", default=Path(__file__).with_name("rules_subcategories_v1.json"), type=Path)
    parser.add_argument("--produto-column", default="produto")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    for input_path, output_path in _build_jobs(args.input, args.output):
        print(f"\nProcessing: {input_path.name}")
        categorize_file(
            input_path=input_path,
            output_path=output_path,
            rules_path=args.rules,
            subcategories_rules_path=args.subcategories_rules,
            produto_column=args.produto_column,
        )
        print(f"Saved: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
