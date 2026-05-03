BEGIN;

-- Screen 1: Summary dashboard (basket total + top 10 items with MoM)
CREATE OR REPLACE FUNCTION inflacao_brasil.get_dashboard_summary(p_month_ref DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    month_ref DATE,
    basket_total_current NUMERIC(14,4),
    basket_total_previous NUMERIC(14,4),
    basket_mom_pct NUMERIC(10,4),
    basket_delta_brl NUMERIC(14,4),
    item_count INTEGER
)
LANGUAGE sql
AS $$
WITH current_basket AS (
    SELECT
        imp.month_ref,
        sum(imp.robust_median_price)::NUMERIC(14,4) AS basket_total,
        count(*)::INTEGER AS item_count
    FROM inflacao_brasil.item_monthly_price imp
    WHERE imp.month_ref <= p_month_ref
    GROUP BY imp.month_ref
),
with_deltas AS (
    SELECT
        cb.month_ref,
        cb.basket_total,
        lag(cb.basket_total) OVER (ORDER BY cb.month_ref) AS prev_basket_total,
        cb.item_count
    FROM current_basket cb
)
SELECT
    wd.month_ref,
    wd.basket_total,
    wd.prev_basket_total,
    CASE
        WHEN wd.prev_basket_total IS NULL OR wd.prev_basket_total = 0 THEN NULL
        ELSE round(((wd.basket_total / wd.prev_basket_total) - 1) * 100, 4)
    END AS basket_mom_pct,
    CASE
        WHEN wd.prev_basket_total IS NULL THEN NULL
        ELSE round(wd.basket_total - wd.prev_basket_total, 4)
    END AS basket_delta_brl,
    wd.item_count
FROM with_deltas wd
WHERE wd.month_ref = (SELECT max(month_ref) FROM current_basket WHERE month_ref <= p_month_ref);
$$;

-- Screen 1: Top 10 items by current price with MoM
CREATE OR REPLACE FUNCTION inflacao_brasil.get_dashboard_items(p_month_ref DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    item_id BIGINT,
    item_name TEXT,
    current_price NUMERIC(12,4),
    previous_price NUMERIC(12,4),
    mom_robust_pct NUMERIC(10,4),
    delta_brl NUMERIC(12,4),
    is_outlier BOOLEAN,
    is_confirmed_shock BOOLEAN
)
LANGUAGE sql
AS $$
WITH latest_month AS (
    SELECT max(month_ref) AS month_ref
    FROM inflacao_brasil.item_monthly_price
    WHERE month_ref <= p_month_ref
),
item_series_with_rank AS (
    SELECT
        ik.id,
        concat_ws(' ', ik.qtd_embalagem, ik.unidade_sigla) AS item_name,
        imp.robust_median_price,
        imp.is_outlier,
        imp.is_confirmed_shock,
        lag(imp.robust_median_price) OVER (
            PARTITION BY ik.id
            ORDER BY imp.month_ref
        ) AS prev_price,
        row_number() OVER (
            PARTITION BY ik.id
            ORDER BY imp.month_ref DESC
        ) AS rn
    FROM inflacao_brasil.item_key ik
    INNER JOIN inflacao_brasil.item_monthly_price imp
        ON imp.item_id = ik.id
    WHERE imp.month_ref <= p_month_ref
),
current_items AS (
    SELECT
        id, item_name, robust_median_price, is_outlier, is_confirmed_shock, prev_price
    FROM item_series_with_rank
    WHERE rn = 1
)
SELECT
    ci.id,
    ci.item_name,
    ci.robust_median_price,
    ci.prev_price,
    CASE
        WHEN ci.prev_price IS NULL OR ci.prev_price = 0 THEN NULL
        ELSE round(((ci.robust_median_price / ci.prev_price) - 1) * 100, 4)
    END AS mom_robust_pct,
    CASE
        WHEN ci.prev_price IS NULL THEN NULL
        ELSE round(ci.robust_median_price - ci.prev_price, 4)
    END AS delta_brl,
    ci.is_outlier,
    ci.is_confirmed_shock
FROM current_items ci
ORDER BY ci.robust_median_price DESC
LIMIT 10;
$$;

-- Screen 2: Wage equivalence + top villains (items driving basket inflation)
CREATE OR REPLACE FUNCTION inflacao_brasil.get_wage_equivalence_and_villains(p_month_ref DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    month_ref DATE,
    basket_total_brl NUMERIC(14,4),
    min_wage_brl NUMERIC(10,2),
    basket_as_pct_wage NUMERIC(10,2),
    work_hours_required INTEGER,
    villain_rank INTEGER,
    villain_item_id BIGINT,
    villain_item_name TEXT,
    villain_contribution_brl NUMERIC(12,4),
    villain_contribution_pct NUMERIC(10,4)
)
LANGUAGE sql
AS $$
WITH latest_month AS (
    SELECT max(month_ref) AS month_ref
    FROM inflacao_brasil.item_monthly_price
    WHERE month_ref <= p_month_ref
),
basket_current AS (
    SELECT
        lm.month_ref,
        sum(imp.robust_median_price)::NUMERIC(14,4) AS basket_total
    FROM latest_month lm
    CROSS JOIN inflacao_brasil.item_monthly_price imp
    WHERE imp.month_ref = lm.month_ref
    GROUP BY lm.month_ref
),
wage_current AS (
    SELECT
        mwh.wage_amount,
        mwh.work_hours_per_month
    FROM inflacao_brasil.minimum_wage_history mwh
    WHERE mwh.effective_from = (
        SELECT max(effective_from)
        FROM inflacao_brasil.minimum_wage_history
        WHERE effective_from <= p_month_ref
    )
),
basket_with_wage AS (
    SELECT
        bc.month_ref,
        bc.basket_total,
        wc.wage_amount,
        wc.work_hours_per_month,
        round((bc.basket_total / wc.wage_amount) * 100, 2) AS basket_pct_wage,
        round((bc.basket_total / wc.wage_amount) * wc.work_hours_per_month)::INTEGER AS hours_required
    FROM basket_current bc
    CROSS JOIN wage_current wc
),
villains_with_rank AS (
    SELECT
        ik.id,
        concat_ws(' ', ik.qtd_embalagem, ik.unidade_sigla) AS item_name,
        imp.robust_median_price,
        lag(imp.robust_median_price) OVER (PARTITION BY ik.id ORDER BY imp.month_ref DESC) AS prev_price,
        row_number() OVER (PARTITION BY ik.id ORDER BY imp.month_ref DESC) AS rn
    FROM inflacao_brasil.item_key ik
    INNER JOIN inflacao_brasil.item_monthly_price imp
        ON imp.item_id = ik.id
    WHERE imp.month_ref = (SELECT month_ref FROM latest_month)
),
villains_latest AS (
    SELECT 
        id, 
        item_name, 
        robust_median_price,
        (robust_median_price - coalesce(prev_price, robust_median_price))::NUMERIC(12,4) AS contribution_delta
    FROM villains_with_rank
    WHERE rn = 1
),
villain_deltas AS (
    SELECT
        vl.id,
        vl.item_name,
        vl.contribution_delta
    FROM villains_latest vl
    ORDER BY abs(vl.contribution_delta) DESC
    LIMIT 3
),
villain_ranked AS (
    SELECT
        row_number() OVER (ORDER BY abs(contribution_delta) DESC) AS rank,
        id,
        item_name,
        contribution_delta,
        round((contribution_delta / (SELECT basket_total FROM basket_current)) * 100, 4) AS contribution_pct
    FROM villain_deltas
)
SELECT
    bw.month_ref,
    bw.basket_total,
    wc.wage_amount,
    bw.basket_pct_wage,
    bw.hours_required,
    vr.rank,
    vr.id,
    vr.item_name,
    vr.contribution_delta,
    vr.contribution_pct
FROM basket_with_wage bw
CROSS JOIN wage_current wc
LEFT JOIN villain_ranked vr ON TRUE
ORDER BY vr.rank;
$$;

-- Screen 3: Historical series (items, basket, IPCA for charting)
CREATE OR REPLACE FUNCTION inflacao_brasil.get_historical_series(
    p_start_month DATE DEFAULT '2022-07-01',
    p_end_month DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    month_ref DATE,
    series_type TEXT,
    series_id TEXT,
    series_name TEXT,
    value NUMERIC(14,4)
)
LANGUAGE sql
AS $$
WITH item_series AS (
    SELECT
        imp.month_ref,
        'item'::TEXT AS series_type,
        concat('item_', ik.id)::TEXT AS series_id,
        concat_ws(' ', ik.qtd_embalagem, ik.unidade_sigla)::TEXT AS series_name,
        imp.robust_median_price AS value
    FROM inflacao_brasil.item_key ik
    INNER JOIN inflacao_brasil.item_monthly_price imp
        ON imp.item_id = ik.id
    WHERE imp.month_ref >= p_start_month
      AND imp.month_ref <= p_end_month
),
basket_series AS (
    SELECT
        imp.month_ref,
        'basket'::TEXT AS series_type,
        'basket_aggregate'::TEXT AS series_id,
        'Cesta Básica Total'::TEXT AS series_name,
        sum(imp.robust_median_price)::NUMERIC(14,4) AS value
    FROM inflacao_brasil.item_monthly_price imp
    WHERE imp.month_ref >= p_start_month
      AND imp.month_ref <= p_end_month
    GROUP BY imp.month_ref
),
ipca_series AS (
    SELECT
                ipca.month_ref AS month_ref,
        'ipca'::TEXT AS series_type,
                'ipca_monthly'::TEXT AS series_id,
                'IPCA Mensal (%)'::TEXT AS series_name,
                ipca.monthly_inflation_pct AS value
        FROM inflacao_brasil.ipca_monthly_public ipca
        WHERE ipca.month_ref >= GREATEST(p_start_month, DATE '2026-01-01')
            AND ipca.month_ref <= p_end_month
)
SELECT * FROM item_series
UNION ALL
SELECT * FROM basket_series
UNION ALL
SELECT * FROM ipca_series
ORDER BY month_ref, series_type, series_id;
$$;

COMMIT;
