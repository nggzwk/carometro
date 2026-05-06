BEGIN;

-- ==============================================================================
-- Fix function return types after month_ref conversion to VARCHAR(7) in migration 0006
-- ==============================================================================
-- After migration 0006 converts month_ref from DATE to VARCHAR(7),
-- functions declared in 0001 need to be updated to return VARCHAR(7) instead of DATE.

-- Drop the function that was declared with DATE return type
DROP FUNCTION IF EXISTS inflacao_brasil.get_basket_monthly_series(BIGINT);

-- Recreate with correct VARCHAR(7) return type
CREATE OR REPLACE FUNCTION inflacao_brasil.get_basket_monthly_series(p_basket_id BIGINT)
RETURNS TABLE (
    month_ref VARCHAR(7),
    basket_total NUMERIC(14,4),
    prev_basket_total NUMERIC(14,4),
    mom_pct NUMERIC(10,4),
    base_basket_total NUMERIC(14,4),
    since_base_pct NUMERIC(10,4)
)
LANGUAGE sql
AS $$
WITH weighted_monthly AS (
    SELECT
        imp.month_ref,
        sum(imp.median_price * bi.weight)::NUMERIC(14,4) AS basket_total,
        count(*) AS present_items,
        (SELECT count(*) FROM inflacao_brasil.basket_item x WHERE x.basket_id = p_basket_id) AS basket_size
    FROM inflacao_brasil.basket_item bi
    INNER JOIN inflacao_brasil.item_monthly_price imp
        ON imp.item_id = bi.item_id
    WHERE bi.basket_id = p_basket_id
    GROUP BY imp.month_ref
),
complete_months AS (
    SELECT
        month_ref,
        basket_total
    FROM weighted_monthly
    WHERE present_items = basket_size
),
deltas AS (
    SELECT
        cm.month_ref,
        cm.basket_total,
        lag(cm.basket_total) OVER (ORDER BY cm.month_ref) AS prev_basket_total,
        first_value(cm.basket_total) OVER (ORDER BY cm.month_ref) AS base_basket_total
    FROM complete_months cm
)
SELECT
    d.month_ref,
    d.basket_total,
    d.prev_basket_total,
    CASE
        WHEN d.prev_basket_total IS NULL OR d.prev_basket_total = 0 THEN NULL
        ELSE round(((d.basket_total / d.prev_basket_total) - 1) * 100, 4)
    END AS mom_pct,
    d.base_basket_total,
    CASE
        WHEN d.base_basket_total IS NULL OR d.base_basket_total = 0 THEN NULL
        ELSE round(((d.basket_total / d.base_basket_total) - 1) * 100, 4)
    END AS since_base_pct
FROM deltas d
ORDER BY d.month_ref;
$$;

COMMIT;
