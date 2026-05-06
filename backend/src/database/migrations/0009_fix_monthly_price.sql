BEGIN;

-- ==============================================================================
-- Fix: Remove redundant to_char calls in refresh_item_monthly_price
-- ==============================================================================
-- Migration 0006 converted month_ref to VARCHAR(7), making to_char() calls
-- on that column invalid. This migration corrects the function definition.

CREATE OR REPLACE FUNCTION inflacao_brasil.refresh_item_monthly_price()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Ensure all relevant item keys exist
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

    -- Clear and rebuild monthly aggregates
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
        o.month_ref, -- FIX: Removed to_char() since column is already VARCHAR(7)
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
    GROUP BY ik.id, o.month_ref; -- FIX: Removed to_char() here as well

    -- Re-calculate outliers and robust prices
    WITH series AS (
        SELECT
            imp.item_id,
            imp.month_ref,
            imp.median_price,
            lag(imp.median_price) OVER (PARTITION BY imp.item_id ORDER BY imp.month_ref) AS prev_price,
            lead(imp.median_price) OVER (PARTITION BY imp.item_id ORDER BY imp.month_ref) AS next_price
        FROM inflacao_brasil.item_monthly_price imp
    ),
    scored AS (
        SELECT
            s.item_id,
            s.month_ref,
            s.median_price,
            s.prev_price,
            s.next_price,
            CASE
                WHEN s.prev_price IS NULL OR s.prev_price = 0 THEN NULL
                ELSE (s.median_price / s.prev_price) - 1
            END AS mom_ratio
        FROM series s
    )
    UPDATE inflacao_brasil.item_monthly_price imp
    SET
        is_outlier = (sc.mom_ratio IS NOT NULL AND abs(sc.mom_ratio) > 0.50),
        outlier_reason = CASE WHEN abs(sc.mom_ratio) > 0.50 THEN 'extreme_volatility' ELSE NULL END,
        robust_median_price = CASE 
            WHEN abs(sc.mom_ratio) > 0.50 AND sc.prev_price IS NOT NULL THEN sc.prev_price 
            ELSE sc.median_price 
        END
    FROM scored sc
    WHERE imp.item_id = sc.item_id AND imp.month_ref = sc.month_ref;

END $$;

COMMIT;