BEGIN;

ALTER TABLE inflacao_brasil.item_monthly_price
    ADD COLUMN IF NOT EXISTS is_outlier BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS outlier_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_confirmed_shock BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shock_reason TEXT,
    ADD COLUMN IF NOT EXISTS robust_median_price NUMERIC(12,4);

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
        o.month_ref,
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
    GROUP BY ik.id, o.month_ref;

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
            END AS next2_cum_ratio
        FROM series s
    ),
    classified AS (
        SELECT
            sc.*,
            (sc.mom_ratio IS NOT NULL AND abs(sc.mom_ratio) >= 1.0) AS is_candidate_spike,
            (
                sc.mom_ratio IS NOT NULL
                AND abs(sc.mom_ratio) >= 1.0
                AND (
                    (sc.next_ratio IS NOT NULL
                        AND sign(sc.next_ratio) = sign(sc.mom_ratio)
                        AND abs(sc.next_ratio) >= 0.20)
                    OR
                    (sc.next2_cum_ratio IS NOT NULL
                        AND sign(sc.next2_cum_ratio) = sign(sc.mom_ratio)
                        AND abs(sc.next2_cum_ratio) >= 0.20)
                )
            ) AS is_persistent_shock
        FROM scored sc
    )
    UPDATE inflacao_brasil.item_monthly_price imp
    SET
        is_confirmed_shock = c.is_persistent_shock,
        shock_reason = CASE
            WHEN c.is_persistent_shock
                 AND c.next_ratio IS NOT NULL
                 AND sign(c.next_ratio) = sign(c.mom_ratio)
                 AND abs(c.next_ratio) >= 0.20
                THEN 'persists_next_month'
            WHEN c.is_persistent_shock
                 AND c.next2_cum_ratio IS NOT NULL
                 AND sign(c.next2_cum_ratio) = sign(c.mom_ratio)
                 AND abs(c.next2_cum_ratio) >= 0.20
                THEN 'persists_within_two_months'
            ELSE NULL
        END,
        is_outlier = c.is_candidate_spike AND NOT c.is_persistent_shock,
        outlier_reason = CASE
            WHEN c.is_candidate_spike AND NOT c.is_persistent_shock
                THEN 'high_mom_spike_not_persistent'
            ELSE NULL
        END,
        robust_median_price = CASE
            WHEN c.is_candidate_spike AND NOT c.is_persistent_shock THEN
                CASE
                    WHEN c.prev_price IS NOT NULL AND c.next_price IS NOT NULL
                        THEN round((((c.prev_price + c.next_price) / 2)::NUMERIC), 4)
                    WHEN c.prev_price IS NOT NULL
                        THEN c.prev_price
                    WHEN c.next_price IS NOT NULL
                        THEN c.next_price
                    ELSE c.median_price
                END
            ELSE c.median_price
        END
    FROM classified c
    WHERE imp.item_id = c.item_id
      AND imp.month_ref = c.month_ref;
END;
$$;

COMMIT;
