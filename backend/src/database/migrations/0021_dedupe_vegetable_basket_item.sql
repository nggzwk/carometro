BEGIN;

-- ==============================================================================
-- Fix: vegetable_basket_item duplicated seed rows + missing UNIQUE constraint
-- ==============================================================================
-- Migration 0019 seeds 10 items with `INSERT ... ON CONFLICT DO NOTHING`, but the
-- table had no unique constraint for the ON CONFLICT to match. When the seed ran
-- more than once the rows were inserted again, leaving 20 rows (10 distinct x 2).
-- The /api/vegetable-basket/items/price endpoint loops over this table, so every
-- item was emitted twice.
--
-- This migration removes the duplicate rows (keeping the earliest id per item) and
-- adds the UNIQUE constraint the seed expects, making re-seeding idempotent.

-- 1. Drop duplicates, keeping the lowest id for each (primary_subcategoria, unit_sigla).
DELETE FROM inflacao_brasil.vegetable_basket_item a
USING inflacao_brasil.vegetable_basket_item b
WHERE a.primary_subcategoria = b.primary_subcategoria
  AND a.unit_sigla = b.unit_sigla
  AND a.id > b.id;

-- 2. Enforce uniqueness on the natural key (both columns are NOT NULL, so no
--    NULL-distinctness gap). This is what 0019's ON CONFLICT DO NOTHING relies on.
ALTER TABLE inflacao_brasil.vegetable_basket_item
    ADD CONSTRAINT uq_vegetable_basket_item_primary_unit
    UNIQUE (primary_subcategoria, unit_sigla);

COMMIT;
