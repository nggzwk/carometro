#!/usr/bin/env python3
"""CSV cleaners for the inflation pipeline.

Both portal formats (legacy 2022-2023 and the cotacoes 2023+ format) share the
same cleaning flow: read -> resolve target date -> filter by date -> map source
columns to the canonical schema -> normalize -> deduplicate -> sort -> save.

The only differences are encoding/delimiter, source column names, date formats,
and a couple of format-specific transforms. Those differences are captured in a
``CleanSpec`` so the flow itself lives in a single place (``_clean_csv``).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import pandas as pd

from csv_utils import parse_date_br, parse_date_iso, resolve_target_date


# --- Canonical output schema -------------------------------------------------

REQUIRED_COLUMNS = [
    "data_pesquisa",
    "rede",
    "endereco",
    "codigo_categoria",
    "id_produto",
    "produto",
    "preco",
    "qtd_embalagem",
    "unidade_sigla",
]

DEDUP_COLUMNS = ["produto", "qtd_embalagem", "unidade_sigla"]

TEMP_PRECO_COLUMN = "__preco_num__"
TEMP_GROUP_SIZE_COLUMN = "__group_size__"
TEMP_GROUP_RANK_COLUMN = "__group_rank__"
TEMP_CODIGO_CATEGORIA_COLUMN = "__codigo_categoria_num__"


# --- Shared field normalizers ------------------------------------------------

def _pick_column(frame: pd.DataFrame, aliases: list[str]) -> pd.Series:
    for alias in aliases:
        if alias in frame.columns:
            return frame[alias]
    return pd.Series([""] * len(frame), index=frame.index)


def _normalize_produto(value: str) -> str:
    if pd.isna(value):
        return ""
    text = str(value)
    text = re.sub(r"\(\s*\+\s*\)\s*BARATO|\(\s*\+\s*BARATO\s*\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bLATA\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _parse_preco(value: str) -> float:
    if pd.isna(value):
        return float("inf")
    text = str(value).strip().replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return float("inf")


def _normalize_numeric_string(value: str) -> str:
    """Render a numeric-ish string without trailing decimals (3.0 -> '3')."""
    if pd.isna(value):
        return ""
    text = str(value).strip().replace(",", ".")
    if text == "":
        return ""
    try:
        number = float(text)
        if number.is_integer():
            return str(int(number))
        return f"{number:g}"
    except ValueError:
        return text


def _normalize_codigo_categoria(value: str) -> str:
    if pd.isna(value):
        return ""
    text = str(value).strip().replace(",", ".")
    if text == "":
        return ""
    try:
        number = float(text)
        if number.is_integer():
            return str(int(number))
        return text
    except ValueError:
        return text


# --- Shared deduplication ----------------------------------------------------

def _filter_group_outliers(group: pd.DataFrame) -> pd.DataFrame:
    valid = group[
        (group[TEMP_PRECO_COLUMN] > 0) & (group[TEMP_PRECO_COLUMN] < float("inf"))
    ].copy()

    if len(valid) < 4:
        return valid

    q1 = valid[TEMP_PRECO_COLUMN].quantile(0.25)
    q3 = valid[TEMP_PRECO_COLUMN].quantile(0.75)
    iqr = q3 - q1

    if pd.isna(iqr) or iqr <= 0:
        return valid

    lower = max(0.0, q1 - 1.5 * iqr)
    upper = q3 + 1.5 * iqr
    filtered = valid[
        (valid[TEMP_PRECO_COLUMN] >= lower) & (valid[TEMP_PRECO_COLUMN] <= upper)
    ]

    if filtered.empty:
        return valid
    return filtered


def _select_output_rows(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame[TEMP_GROUP_SIZE_COLUMN] = frame.groupby(DEDUP_COLUMNS)["produto"].transform("size")
    frame[TEMP_GROUP_RANK_COLUMN] = frame.groupby(DEDUP_COLUMNS).cumcount()

    selected_indices: list[int] = []
    for _, group in frame.groupby(DEDUP_COLUMNS, sort=False):
        if len(group) == 1:
            selected_indices.append(group.index[0])
            continue

        candidates = _filter_group_outliers(group)
        if candidates.empty:
            selected_indices.append(group.index[0])
            continue

        median_price = candidates[TEMP_PRECO_COLUMN].median()
        scored_candidates = candidates.assign(
            __dist_to_median__=(candidates[TEMP_PRECO_COLUMN] - median_price).abs()
        )
        chosen_index = scored_candidates.sort_values(
            by=["__dist_to_median__", TEMP_PRECO_COLUMN],
            ascending=[True, True],
            kind="stable",
        ).index[0]
        selected_indices.append(chosen_index)

    return frame.loc[selected_indices].copy()


# --- Legacy old-portal specifics ---------------------------------------------

def _normalize_endereco_numero(value: str) -> str:
    return _normalize_numeric_string(value)


def _build_endereco(frame: pd.DataFrame) -> pd.Series:
    address_columns = ["endereco_rua", "endereco_numero", "bairro", "cidade", "estado"]
    parts = pd.DataFrame(index=frame.index)
    for col in address_columns:
        if col in frame.columns:
            parts[col] = frame[col].fillna("").astype(str).str.strip()
        else:
            parts[col] = ""
    parts["endereco_numero"] = parts["endereco_numero"].apply(_normalize_endereco_numero)
    return parts.apply(lambda row: " - ".join(part for part in row if part), axis=1)


# --- New cotacoes-portal specifics -------------------------------------------

ALLOWED_UNITS = ("ML", "LITRO", "GR", "KG", "PCTE", "ROLO", "MC/CX", "UNIDADES", "UN", "DZ")


def _read_csv_with_encodings(input_file: Path, delimiter: str, encodings: list[str]) -> pd.DataFrame | None:
    for encoding in encodings:
        try:
            df = pd.read_csv(
                input_file,
                delimiter=delimiter,
                dtype={"data_pesquisa": str},
                on_bad_lines="skip",
                engine="c",
                encoding=encoding,
            )
            print(f"✓ File read with encoding: {encoding}")
            return df
        except (UnicodeDecodeError, LookupError):
            continue
        except Exception as exc:
            print(f"✗ Error reading CSV with {encoding}: {exc}")
            return None
    return None


def _extract_packaging_fields(produto: str) -> tuple[str, str, str]:
    if pd.isna(produto) or not str(produto).strip():
        return "", "", ""

    texto = str(produto).strip()
    units_pattern = "|".join(re.escape(unit) for unit in ALLOWED_UNITS)
    match = re.search(
        rf"\s*-\s*([\d]+(?:[\.,]\d+)?)\s*({units_pattern})\s*$",
        texto,
        flags=re.IGNORECASE,
    )
    if match is None:
        return texto, "", ""

    produto_limpo = texto[:match.start()].strip().rstrip("-").strip()
    qtd_embalagem = match.group(1).replace(",", ".")
    unidade_sigla = match.group(2).upper()
    return produto_limpo, qtd_embalagem, unidade_sigla


def _split_packaging(cleaned: pd.DataFrame) -> pd.DataFrame:
    """New format embeds qty/unit inside the produto string; split it out."""
    produto_split = cleaned["produto"].apply(_extract_packaging_fields)
    split_df = pd.DataFrame(
        produto_split.tolist(),
        index=cleaned.index,
        columns=["produto", "qtd_embalagem", "unidade_sigla"],
    )
    cleaned[["produto", "qtd_embalagem", "unidade_sigla"]] = split_df
    return cleaned


# --- Format specification ----------------------------------------------------

@dataclass(frozen=True)
class CleanSpec:
    label: str
    delimiter: str
    output_sep: str
    column_aliases: dict[str, list[str]]
    df_parser: Callable[[str], object]
    df_date_format: str
    target_parser: Callable[[str], object] = parse_date_br
    encodings: list[str] | None = None
    warn_missing_columns: bool = False
    build_overrides: dict[str, Callable[[pd.DataFrame], pd.Series]] = field(default_factory=dict)
    post_build: Callable[[pd.DataFrame], pd.DataFrame] | None = None
    extra_normalizers: dict[str, Callable[[str], str]] = field(default_factory=dict)

    def read(self, input_file: Path) -> pd.DataFrame | None:
        if self.encodings is not None:
            return _read_csv_with_encodings(input_file, self.delimiter, self.encodings)
        try:
            return pd.read_csv(
                input_file,
                delimiter=self.delimiter,
                dtype={"data_pesquisa": str},
                on_bad_lines="skip",
                engine="c",
            )
        except Exception as exc:
            print(f"✗ Error reading CSV: {exc}")
            return None


# --- Shared cleaning driver --------------------------------------------------

def _clean_csv(input_file: Path, output_file: Path, target_date: str, spec: CleanSpec) -> bool:
    print(f"\nCleaning {spec.label}: {input_file.name}")
    print(f"Delimiter: {spec.delimiter!r}")

    df = spec.read(input_file)
    if df is None:
        print("✗ Error reading CSV: could not load file")
        return False

    if "data_pesquisa" not in df.columns:
        print("✗ Required column not found: data_pesquisa")
        return False

    print(f"Rows before filtering: {len(df)}")

    selected_date = resolve_target_date(
        df,
        target_date,
        target_parser=spec.target_parser,
        df_parser=spec.df_parser,
        df_date_format_str=spec.df_date_format,
        max_days_offset=7,
        fallback_to_latest=True,
    )
    if selected_date is None:
        return False

    filtered = df[df["data_pesquisa"] == selected_date].copy()
    print(f"Rows after filtering by date {selected_date}: {len(filtered)}")

    if spec.warn_missing_columns:
        missing = [
            alias
            for output_column in REQUIRED_COLUMNS
            for alias in spec.column_aliases.get(output_column, [])
            if alias not in filtered.columns
        ]
        if missing:
            print(f"⚠ Missing source columns (filled as empty): {', '.join(sorted(set(missing)))}")

    cleaned = pd.DataFrame(index=filtered.index)
    for output_column in REQUIRED_COLUMNS:
        override = spec.build_overrides.get(output_column)
        if override is not None:
            cleaned[output_column] = override(filtered)
        else:
            cleaned[output_column] = _pick_column(filtered, spec.column_aliases.get(output_column, []))

    cleaned = cleaned.fillna("")

    if spec.post_build is not None:
        cleaned = spec.post_build(cleaned)

    cleaned["produto"] = cleaned["produto"].apply(_normalize_produto)
    cleaned["qtd_embalagem"] = cleaned["qtd_embalagem"].apply(_normalize_numeric_string)
    for column, normalizer in spec.extra_normalizers.items():
        cleaned[column] = cleaned[column].apply(normalizer)
    cleaned[TEMP_PRECO_COLUMN] = cleaned["preco"].apply(_parse_preco)

    before = len(cleaned)
    cleaned = _select_output_rows(cleaned)
    print(f"Duplicates removed: {before - len(cleaned)}")

    cleaned["data_pesquisa"] = pd.to_datetime(
        cleaned["data_pesquisa"],
        format=spec.df_date_format,
        errors="coerce",
    ).dt.strftime("%Y-%m-%d")
    cleaned["data_pesquisa"] = cleaned["data_pesquisa"].fillna("")

    cleaned[TEMP_CODIGO_CATEGORIA_COLUMN] = pd.to_numeric(cleaned["codigo_categoria"], errors="coerce")
    cleaned = cleaned.sort_values(
        by=[TEMP_CODIGO_CATEGORIA_COLUMN, "codigo_categoria"],
        ascending=[True, True],
        kind="stable",
        na_position="last",
    )
    cleaned = cleaned.drop(
        columns=[
            TEMP_PRECO_COLUMN,
            TEMP_GROUP_SIZE_COLUMN,
            TEMP_GROUP_RANK_COLUMN,
            TEMP_CODIGO_CATEGORIA_COLUMN,
        ]
    )
    cleaned = cleaned[REQUIRED_COLUMNS]

    try:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        cleaned.to_csv(output_file, index=False, sep=spec.output_sep)
        print(f"✓ Cleaned CSV saved: {output_file.name}")
        print(f"Final rows: {len(cleaned)}")
        return True
    except Exception as exc:
        print(f"✗ Error saving CSV: {exc}")
        return False


# --- Public per-format entry points ------------------------------------------

OLD_FORMAT_SPEC = CleanSpec(
    label="legacy old portal",
    delimiter=",",
    output_sep=",",
    column_aliases={
        "data_pesquisa": ["data_pesquisa"],
        "rede": ["rede"],
        "endereco": ["endereco_rua", "endereco_numero", "bairro", "cidade", "estado"],
        "codigo_categoria": ["id_produto_classificacao"],
        "id_produto": ["id_produto"],
        "produto": ["produto"],
        "preco": ["preco_encontrado"],
        "qtd_embalagem": ["qtd_embalagem"],
        "unidade_sigla": ["unidade_sigla"],
    },
    target_parser=parse_date_br,
    df_parser=parse_date_br,
    df_date_format="%d/%m/%Y",
    warn_missing_columns=True,
    build_overrides={"endereco": _build_endereco},
)

NEW_FORMAT_SPEC = CleanSpec(
    label="new portal",
    delimiter=";",
    output_sep=";",
    column_aliases={
        "data_pesquisa": ["data_pesquisa"],
        "rede": ["rede"],
        "endereco": ["endereco_completo"],
        "codigo_categoria": ["codigo_categoria"],
        "id_produto": ["id_produto"],
        "produto": ["descricao"],
        "preco": ["preco_regular"],
        "qtd_embalagem": [],
        "unidade_sigla": [],
    },
    target_parser=parse_date_br,
    df_parser=parse_date_iso,
    df_date_format="%Y-%m-%d",
    encodings=["utf-8", "latin-1", "iso-8859-1", "cp1252"],
    post_build=_split_packaging,
    extra_normalizers={"codigo_categoria": _normalize_codigo_categoria},
)


def clean_old_format_csv(input_file: Path, output_file: Path, target_date: str) -> bool:
    """Clean a legacy old-portal CSV (07/2022-06/2023)."""
    return _clean_csv(input_file, output_file, target_date, OLD_FORMAT_SPEC)


def clean_new_format_csv(input_file: Path, output_file: Path, target_date: str) -> bool:
    """Clean a cotacoes-format CSV (2023/07 onward)."""
    return _clean_csv(input_file, output_file, target_date, NEW_FORMAT_SPEC)
