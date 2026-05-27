#!/usr/bin/env python3
"""Run database migrations in order with history tracking."""

import argparse
import os
import sys
from pathlib import Path

import psycopg


def ensure_migrations_table(conn) -> None:
    """Create migrations tracking table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS inflacao_brasil.migrations_applied (
                migration_name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        conn.commit()


def is_migration_applied(conn, migration_name: str) -> bool:
    """Check if migration has already been applied."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM inflacao_brasil.migrations_applied WHERE migration_name = %s",
            (migration_name,)
        )
        return cur.fetchone() is not None


def record_migration(conn, migration_name: str) -> None:
    """Record that a migration has been applied."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO inflacao_brasil.migrations_applied (migration_name) VALUES (%s)",
            (migration_name,)
        )
        conn.commit()


def remove_migration_record(conn, migration_name: str) -> None:
    """Remove a migration record after a successful rollback."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM inflacao_brasil.migrations_applied WHERE migration_name = %s",
            (migration_name,)
        )
        conn.commit()


def get_last_applied_migration(conn) -> str | None:
    """Return the most recently applied migration name, if any."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT migration_name
            FROM inflacao_brasil.migrations_applied
            ORDER BY applied_at DESC, migration_name DESC
            LIMIT 1
            """
        )
        row = cur.fetchone()
        return row[0] if row else None


def resolve_rollback_file(migrations_dir: Path, migration_name: str) -> Path | None:
    """Find a rollback SQL file for the given migration name."""
    base_name = migration_name[:-4] if migration_name.endswith(".sql") else migration_name
    candidates = [
        migrations_dir / f"{base_name}.down.sql",
        migrations_dir / f"{base_name}_rollback.sql",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def normalize_migration_name(migration_name: str) -> str:
    """Ensure the migration name ends with .sql for lookups and tracking."""
    return migration_name if migration_name.endswith(".sql") else f"{migration_name}.sql"


def get_migration_files(migrations_dir: Path) -> list[Path]:
    """Return ordered migration files excluding rollback helpers."""
    return sorted(
        migration_file
        for migration_file in migrations_dir.glob("*.sql")
        if not migration_file.name.endswith(".down.sql")
        and not migration_file.name.endswith("_rollback.sql")
    )


def read_sql(file_path: Path) -> str:
    """Read SQL content from a migration file."""
    with open(file_path, "r") as f:
        return f.read()


def execute_sql(conn, sql_content: str) -> None:
    """Execute SQL content inside a single cursor context."""
    with conn.cursor() as cur:
        cur.execute(sql_content)


def run_down(conn, migrations_dir: Path, target_migration: str | None) -> None:
    """Rollback a single migration."""
    migration_name = (
        normalize_migration_name(target_migration)
        if target_migration
        else get_last_applied_migration(conn)
    )

    if not migration_name:
        print("No migrations have been applied yet.")
        return

    if not is_migration_applied(conn, migration_name):
        print(f"⊘ {migration_name} (not applied)")
        return

    rollback_file = resolve_rollback_file(migrations_dir, migration_name)
    if not rollback_file:
        raise FileNotFoundError(
            f"No rollback file found for {migration_name}. "
            "Expected .down.sql or _rollback.sql sibling."
        )

    sql_content = read_sql(rollback_file)

    try:
        execute_sql(conn, sql_content)
        conn.commit()
        remove_migration_record(conn, migration_name)
        print(f"✓ {migration_name} rolled back successfully")
    except Exception as e:
        conn.rollback()
        print(f"✗ Error rolling back {migration_name}: {e}")
        raise


def run_up(conn, migration_files: list[Path]) -> None:
    """Apply all pending migrations."""
    if not migration_files:
        print("No migration files found.")
        return

    applied_count = 0
    skipped_count = 0
    for migration_file in migration_files:
        migration_name = migration_file.name

        if is_migration_applied(conn, migration_name):
            print(f"⊘ {migration_name} (already applied)")
            skipped_count += 1
            continue

        sql_content = read_sql(migration_file)

        try:
            execute_sql(conn, sql_content)
            conn.commit()
            record_migration(conn, migration_name)
            print(f"✓ {migration_name} completed successfully")
            applied_count += 1
        except Exception as e:
            conn.rollback()
            print(f"✗ Error in {migration_name}: {e}")
            raise


def run_migrations(database_url: str, direction: str, target_migration: str | None) -> None:
    """Execute migrations in order (up) or rollback a migration (down)."""
    migrations_dir = Path(__file__).parent / "src" / "database" / "migrations"
    migration_files = get_migration_files(migrations_dir)

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE SCHEMA IF NOT EXISTS inflacao_brasil;")
                conn.commit()
            ensure_migrations_table(conn)

            if direction == "down":
                run_down(conn, migrations_dir, target_migration)
                return

            run_up(conn, migration_files)

    except Exception as e:
        print(f"\n✗ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run database migrations.")
    parser.add_argument(
        "direction",
        nargs="?",
        default="up",
        choices=["up", "down", "rollback"],
        help="Apply migrations (up) or rollback one migration (down).",
    )
    parser.add_argument(
        "migration",
        nargs="?",
        default=None,
        help="Optional migration name to rollback.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable not set", file=sys.stderr)
        sys.exit(1)

    args = parse_args()
    direction = "down" if args.direction in {"down", "rollback"} else "up"
    run_migrations(db_url, direction, args.migration)
