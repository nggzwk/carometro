BEGIN;

-- ==============================================================================
-- Phase 1: Convert month_ref from DATE to VARCHAR(7) format (YYYY-MM)
-- ==============================================================================

-- Drop dependent views and functions first
DROP FUNCTION IF EXISTS inflacao_brasil.get_dashboard_items(DATE);
DROP FUNCTION IF EXISTS inflacao_brasil.get_dashboard_summary(DATE);
DROP FUNCTION IF EXISTS inflacao_brasil.refresh_item_monthly_price();

-- price_observation table: convert month_ref DATE to VARCHAR(7)
-- First, add new column with converted data
ALTER TABLE inflacao_brasil.price_observation
    ADD COLUMN month_ref_varchar VARCHAR(7);

UPDATE inflacao_brasil.price_observation
    SET month_ref_varchar = to_char(month_ref, 'YYYY-MM');

-- Drop the constraint that checked month_ref relationship
ALTER TABLE inflacao_brasil.price_observation
    DROP CONSTRAINT IF EXISTS ck_price_observation_month_ref;

-- Drop old column and rename new one
ALTER TABLE inflacao_brasil.price_observation
    DROP COLUMN month_ref;

ALTER TABLE inflacao_brasil.price_observation
    RENAME COLUMN month_ref_varchar TO month_ref;

-- Add NOT NULL and add back index
ALTER TABLE inflacao_brasil.price_observation
    ALTER COLUMN month_ref SET NOT NULL;

-- Recreate index on month_ref
DROP INDEX IF EXISTS inflacao_brasil.ix_price_observation_month_ref;
CREATE INDEX ix_price_observation_month_ref
    ON inflacao_brasil.price_observation (month_ref);

-- item_monthly_price table: convert month_ref DATE to VARCHAR(7)
-- Primary key includes month_ref, so we need to handle carefully
-- Backup data first
CREATE TEMPORARY TABLE temp_item_monthly_price AS
    SELECT
        item_id,
        to_char(month_ref, 'YYYY-MM') AS month_ref,
        median_price,
        avg_price,
        obs_count,
        min_price,
        max_price,
        is_outlier,
        outlier_reason,
        is_confirmed_shock,
        shock_reason,
        robust_median_price,
        created_at
    FROM inflacao_brasil.item_monthly_price;

-- Drop the table
DROP TABLE inflacao_brasil.item_monthly_price CASCADE;

-- Recreate with month_ref as VARCHAR(7)
CREATE TABLE IF NOT EXISTS inflacao_brasil.item_monthly_price (
    item_id BIGINT NOT NULL REFERENCES inflacao_brasil.item_key(id) ON DELETE CASCADE,
    month_ref VARCHAR(7) NOT NULL,
    median_price NUMERIC(12,4) NOT NULL,
    avg_price NUMERIC(12,4) NOT NULL,
    obs_count INTEGER NOT NULL,
    min_price NUMERIC(12,4) NOT NULL,
    max_price NUMERIC(12,4) NOT NULL,
    is_outlier BOOLEAN NOT NULL DEFAULT FALSE,
    outlier_reason TEXT,
    is_confirmed_shock BOOLEAN NOT NULL DEFAULT FALSE,
    shock_reason TEXT,
    robust_median_price NUMERIC(12,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, month_ref)
);

CREATE INDEX ix_item_monthly_price_month
    ON inflacao_brasil.item_monthly_price (month_ref);

-- Restore data
INSERT INTO inflacao_brasil.item_monthly_price
    SELECT * FROM temp_item_monthly_price;

DROP TABLE temp_item_monthly_price;

-- ipca_monthly_public table: convert month_ref DATE to VARCHAR(7)
CREATE TEMPORARY TABLE temp_ipca_monthly_public AS
    SELECT
        to_char(month_ref, 'YYYY-MM') AS month_ref,
        monthly_inflation_pct,
        source_url,
        created_at
    FROM inflacao_brasil.ipca_monthly_public;

DROP TABLE inflacao_brasil.ipca_monthly_public CASCADE;

CREATE TABLE IF NOT EXISTS inflacao_brasil.ipca_monthly_public (
    month_ref VARCHAR(7) PRIMARY KEY,
    monthly_inflation_pct NUMERIC(5,2) NOT NULL,
    source_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ipca_monthly_public_month_ref
    ON inflacao_brasil.ipca_monthly_public (month_ref);

INSERT INTO inflacao_brasil.ipca_monthly_public
    SELECT * FROM temp_ipca_monthly_public;

DROP TABLE temp_ipca_monthly_public;

-- ==============================================================================
-- Phase 2: Recreate functions with VARCHAR(7) month_ref
-- ==============================================================================

CREATE OR REPLACE FUNCTION inflacao_brasil.refresh_item_monthly_price()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO inflacao_brasil.item_key (
        qtd_embalagem,
        unidade_sigla,
        produto_categoria,
        produto_subcategoria
    )
    SELECT DISTINCT
        trim(o.qtd_embalagem) AS qtd_embalagem,
        upper(trim(o.unidade_sigla)) AS unidade_sigla,
        o.produto_categoria,
        o.produto_subcategoria
    FROM inflacao_brasil.price_observation o
    WHERE o.produto_categoria IS NOT NULL
      AND o.produto_subcategoria IS NOT NULL
      AND NULLIF(trim(o.qtd_embalagem), '') IS NOT NULL
      AND NULLIF(trim(o.unidade_sigla), '') IS NOT NULL
    ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
    DO NOTHING;

    TRUNCATE TABLE inflacao_brasil.item_monthly_price;

    INSERT INTO inflacao_brasil.item_monthly_price (
        item_id,
        month_ref,
        median_price,
        avg_price,
        obs_count,
        min_price,
        max_price
    )
    SELECT
        ik.id AS item_id,
        to_char(o.month_ref, 'YYYY-MM') AS month_ref,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY o.preco)::NUMERIC(12,4) AS median_price,
        avg(o.preco)::NUMERIC(12,4) AS avg_price,
        count(*)::INTEGER AS obs_count,
        min(o.preco)::NUMERIC(12,4) AS min_price,
        max(o.preco)::NUMERIC(12,4) AS max_price
    FROM inflacao_brasil.price_observation o
    INNER JOIN inflacao_brasil.item_key ik
        ON ik.qtd_embalagem = trim(o.qtd_embalagem)
       AND ik.unidade_sigla = upper(trim(o.unidade_sigla))
       AND ik.produto_categoria = o.produto_categoria
       AND ik.produto_subcategoria = o.produto_subcategoria
    WHERE o.produto_categoria IS NOT NULL
      AND o.produto_subcategoria IS NOT NULL
      AND NULLIF(trim(o.qtd_embalagem), '') IS NOT NULL
      AND NULLIF(trim(o.unidade_sigla), '') IS NOT NULL
    GROUP BY ik.id, to_char(o.month_ref, 'YYYY-MM');

    WITH series AS (
        SELECT
            imp.item_id,
            imp.month_ref,
            imp.median_price,
            lag(imp.median_price) OVER (
                PARTITION BY imp.item_id
                ORDER BY imp.month_ref
            ) AS prev_price,
            lead(imp.median_price) OVER (
                PARTITION BY imp.item_id
                ORDER BY imp.month_ref
            ) AS next_price,
            lead(imp.median_price, 2) OVER (
                PARTITION BY imp.item_id
                ORDER BY imp.month_ref
            ) AS next2_price
        FROM inflacao_brasil.item_monthly_price imp
    ),
    scored AS (
        SELECT
            s.item_id,
            s.month_ref,
            s.median_price,
            s.prev_price,
            s.next_price,
            s.next2_price,
            CASE
                WHEN s.prev_price IS NULL OR s.prev_price = 0 THEN NULL
                ELSE (s.median_price / s.prev_price) - 1
            END AS mom_ratio,
            CASE
                WHEN s.next_price IS NULL OR s.median_price = 0 THEN NULL
                ELSE (s.next_price / s.median_price) - 1
            END AS next_ratio,
            CASE
                WHEN s.next2_price IS NULL OR s.median_price = 0 THEN NULL
                ELSE (s.next2_price / s.median_price) - 1
            END AS next2_ratio
        FROM series s
    )
    UPDATE inflacao_brasil.item_monthly_price imp
    SET
        is_outlier = CASE
            WHEN sc.mom_ratio IS NOT NULL AND (sc.mom_ratio > 0.20 OR sc.mom_ratio < -0.15) THEN TRUE
            WHEN sc.next_ratio IS NOT NULL AND (sc.next_ratio > 0.20 OR sc.next_ratio < -0.15) THEN TRUE
            ELSE FALSE
        END,
        outlier_reason = CASE
            WHEN sc.mom_ratio IS NOT NULL AND (sc.mom_ratio > 0.20 OR sc.mom_ratio < -0.15) THEN 'mom_threshold'
            WHEN sc.next_ratio IS NOT NULL AND (sc.next_ratio > 0.20 OR sc.next_ratio < -0.15) THEN 'next_ratio_threshold'
            ELSE NULL
        END,
        is_confirmed_shock = CASE
            WHEN sc.mom_ratio IS NOT NULL AND sc.next2_ratio IS NOT NULL
                AND (sc.mom_ratio > 0.30 OR sc.mom_ratio < -0.25)
                AND (sc.next2_ratio > 0.30 OR sc.next2_ratio < -0.25)
            THEN TRUE
            ELSE FALSE
        END,
        shock_reason = CASE
            WHEN sc.mom_ratio IS NOT NULL AND sc.next2_ratio IS NOT NULL
                AND (sc.mom_ratio > 0.30 OR sc.mom_ratio < -0.25)
                AND (sc.next2_ratio > 0.30 OR sc.next2_ratio < -0.25)
            THEN 'confirmed_spike'
            ELSE NULL
        END,
        robust_median_price = CASE
            WHEN CASE
                WHEN sc.mom_ratio IS NOT NULL AND sc.next2_ratio IS NOT NULL
                    AND (sc.mom_ratio > 0.30 OR sc.mom_ratio < -0.25)
                    AND (sc.next2_ratio > 0.30 OR sc.next2_ratio < -0.25)
                THEN TRUE
                ELSE FALSE
            END
            THEN sc.prev_price
            ELSE sc.median_price
        END
    FROM scored sc
    WHERE sc.item_id = imp.item_id
      AND sc.month_ref = imp.month_ref;
END $$;

-- Dashboard Summary function (updated to handle VARCHAR month_ref)
CREATE OR REPLACE FUNCTION inflacao_brasil.get_dashboard_summary(p_month_ref VARCHAR(7) DEFAULT NULL)
RETURNS TABLE (
    month_ref VARCHAR(7),
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
        sum(COALESCE(imp.robust_median_price, imp.median_price))::NUMERIC(14,4) AS basket_total,
        count(*)::INTEGER AS item_count
    FROM inflacao_brasil.item_monthly_price imp
    WHERE (p_month_ref IS NULL OR imp.month_ref <= p_month_ref)
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
WHERE wd.month_ref = (SELECT max(month_ref) FROM current_basket WHERE (p_month_ref IS NULL OR month_ref <= p_month_ref));
$$;

-- Dashboard Items function (updated to handle VARCHAR month_ref)
CREATE OR REPLACE FUNCTION inflacao_brasil.get_dashboard_items(p_month_ref VARCHAR(7) DEFAULT NULL)
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
    WHERE (p_month_ref IS NULL OR month_ref <= p_month_ref)
),
item_series_with_rank AS (
    SELECT
        ik.id,
        concat_ws(' ', ik.qtd_embalagem, ik.unidade_sigla) AS item_name,
        COALESCE(imp.robust_median_price, imp.median_price) AS robust_price,
        imp.is_outlier,
        imp.is_confirmed_shock,
        lag(COALESCE(imp.robust_median_price, imp.median_price)) OVER (
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
    WHERE (p_month_ref IS NULL OR imp.month_ref <= p_month_ref)
),
current_items AS (
    SELECT
        id, item_name, robust_price, is_outlier, is_confirmed_shock, prev_price
    FROM item_series_with_rank
    WHERE rn = 1
)
SELECT
    ci.id,
    ci.item_name,
    ci.robust_price,
    ci.prev_price,
    CASE
        WHEN ci.prev_price IS NULL OR ci.prev_price = 0 THEN NULL
        ELSE round(((ci.robust_price / ci.prev_price) - 1) * 100, 4)
    END AS mom_robust_pct,
    round(ci.robust_price - ci.prev_price, 4),
    ci.is_outlier,
    ci.is_confirmed_shock
FROM current_items ci
ORDER BY ci.robust_price DESC
LIMIT 10;
$$;

-- ==============================================================================
-- Phase 3: Create view for basket items with prices
-- ==============================================================================

CREATE OR REPLACE VIEW inflacao_brasil.vw_basket_items_with_prices AS
WITH latest_prices AS (
    SELECT
        ik.id,
        ik.qtd_embalagem,
        ik.unidade_sigla,
        ik.produto_categoria,
        ik.produto_subcategoria,
        imp.month_ref,
        imp.median_price,
        lag(imp.median_price) OVER (
            PARTITION BY ik.id
            ORDER BY imp.month_ref
        ) AS prev_price,
        row_number() OVER (
            PARTITION BY ik.id
            ORDER BY imp.month_ref DESC
        ) AS rn
    FROM inflacao_brasil.item_key ik
    INNER JOIN inflacao_brasil.item_monthly_price imp
        ON ik.id = imp.item_id
)
SELECT
    b.code AS basket_code,
    b.name AS basket_name,
    lp.produto_categoria,
    lp.produto_subcategoria,
    concat_ws(' ', lp.qtd_embalagem, lp.unidade_sigla) AS item_name,
    lp.month_ref,
    lp.median_price AS current_price,
    lp.prev_price AS previous_price,
    CASE
        WHEN lp.prev_price IS NULL OR lp.prev_price = 0 THEN NULL
        ELSE round(((lp.median_price / lp.prev_price) - 1) * 100, 2)
    END AS mom_pct
FROM inflacao_brasil.basket b
INNER JOIN inflacao_brasil.basket_item bi
    ON b.id = bi.basket_id
INNER JOIN latest_prices lp
    ON bi.item_id = lp.id AND lp.rn = 1;

-- ==============================================================================
-- Phase 4: Seed default basket and items
-- ==============================================================================

-- Ensure the default_basket exists
INSERT INTO inflacao_brasil.basket (code, name)
VALUES ('default_basket', 'Default Basket')
ON CONFLICT (code) DO NOTHING;

-- Get or create item_key entries for the 9 basket items
-- Item 1: Arroz Polido (categoria=4, qtd=1, unidade=KG, subcat=40003)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 4, 40003)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 2: Feijão carioca (categoria=4, qtd=1, unidade=KG, subcat=40012)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 4, 40012)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 3: Farinha de trigo (categoria=4, qtd=1, unidade=KG, subcat=40017)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 4, 40017)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 4: Óleo de soja (categoria=6, qtd=900, unidade=ML, subcat=60001)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('900', 'ML', 6, 60001)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 5: Leite Integral (categoria=3, qtd=1, unidade=L, subcat=30001)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'L', 3, 30001)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 6: Açúcar Cristal (categoria=8, qtd=1, unidade=KG, subcat=80002)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 8, 80002)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 7: Coxao Mole s/Osso (categoria=1, qtd=1, unidade=KG, subcat=10023)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 1, 10023)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 8: Filé de peito (categoria=1, qtd=1, unidade=KG, subcat=10011)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'KG', 1, 10011)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Item 9: Ovos (categoria=2, qtd=1, unidade=DZ, subcat=20001)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('1', 'DZ', 2, 20001)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- Link all 9 items to the default_basket
INSERT INTO inflacao_brasil.basket_item (basket_id, item_id, weight)
SELECT
    b.id,
    ik.id,
    1
FROM inflacao_brasil.basket b
CROSS JOIN inflacao_brasil.item_key ik
WHERE b.code = 'default_basket'
  AND (
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 4 AND ik.produto_subcategoria = 40003) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 4 AND ik.produto_subcategoria = 40012) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 4 AND ik.produto_subcategoria = 40017) OR
    (ik.qtd_embalagem = '900' AND ik.unidade_sigla = 'ML' AND ik.produto_categoria = 6 AND ik.produto_subcategoria = 60001) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'L' AND ik.produto_categoria = 3 AND ik.produto_subcategoria = 30001) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 8 AND ik.produto_subcategoria = 80002) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 1 AND ik.produto_subcategoria = 10023) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'KG' AND ik.produto_categoria = 1 AND ik.produto_subcategoria = 10011) OR
    (ik.qtd_embalagem = '1' AND ik.unidade_sigla = 'DZ' AND ik.produto_categoria = 2 AND ik.produto_subcategoria = 20001)
  )
ON CONFLICT (basket_id, item_id) DO NOTHING;

COMMIT;
