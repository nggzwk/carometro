BEGIN;

-- ==============================================================================
-- Create basket monthly value table for storing pre-calculated basket values
-- with minimum wage equivalence
-- ==============================================================================

CREATE TABLE IF NOT EXISTS inflacao_brasil.basket_monthly_value (
    id BIGSERIAL PRIMARY KEY,
    basket_id BIGINT NOT NULL REFERENCES inflacao_brasil.basket(id) ON DELETE CASCADE,
    month_ref VARCHAR(7) NOT NULL,
    basket_value_brl NUMERIC(14,4) NOT NULL,
    minimum_wage_brl NUMERIC(14,4),
    percentage_of_wage NUMERIC(10,2),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_basket_monthly_value UNIQUE (basket_id, month_ref)
);

CREATE INDEX IF NOT EXISTS ix_basket_monthly_value_month
    ON inflacao_brasil.basket_monthly_value (month_ref);

CREATE INDEX IF NOT EXISTS ix_basket_monthly_value_basket
    ON inflacao_brasil.basket_monthly_value (basket_id, month_ref);

COMMIT;