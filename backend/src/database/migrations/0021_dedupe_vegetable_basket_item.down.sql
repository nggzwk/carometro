BEGIN;

-- Drop the uniqueness constraint added by 0021. The duplicate rows removed by the
-- up migration are not restored (they were a seeding bug).

ALTER TABLE inflacao_brasil.vegetable_basket_item
    DROP CONSTRAINT IF EXISTS uq_vegetable_basket_item_primary_unit;

COMMIT;
