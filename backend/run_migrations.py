#!/usr/bin/env python3
"""Run database migrations in order with history tracking."""

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


def run_migrations(database_url: str) -> None:
    """Execute all migration files in order, tracking applied migrations."""
    migrations_dir = Path(__file__).parent / "src" / "database" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("No migration files found.")
        return

    try:
        with psycopg.connect(database_url) as conn:
            # Ensure schema exists first
            with conn.cursor() as cur:
                cur.execute("CREATE SCHEMA IF NOT EXISTS inflacao_brasil;")
                conn.commit()
            
            # Create migrations tracking table
            ensure_migrations_table(conn)
            
            # Track results
            applied_count = 0
            skipped_count = 0
            
            for migration_file in migration_files:
                migration_name = migration_file.name
                
                # Check if already applied
                if is_migration_applied(conn, migration_name):
                    print(f"⊘ {migration_name} (already applied)")
                    skipped_count += 1
                    continue
                
                print(f"\n{'='*80}")
                print(f"Running: {migration_name}")
                print('='*80)

                with open(migration_file, "r") as f:
                    sql_content = f.read()

                try:
                    with conn.cursor() as cur:
                        cur.execute(sql_content)
                    conn.commit()
                    record_migration(conn, migration_name)
                    print(f"✓ {migration_name} completed successfully")
                    applied_count += 1
                except Exception as e:
                    conn.rollback()
                    print(f"✗ Error in {migration_name}: {e}")
                    raise

        print(f"\n{'='*80}")
        print(f"Migration complete: {applied_count} applied, {skipped_count} skipped")
        print('='*80)

    except Exception as e:
        print(f"\n✗ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable not set", file=sys.stderr)
        sys.exit(1)

    run_migrations(db_url)
