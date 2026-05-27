BEGIN;

ALTER TABLE inflacao_brasil.global_basket_references
    ADD COLUMN IF NOT EXISTS monthly_min_wage_usd NUMERIC(18,8),
    ADD COLUMN IF NOT EXISTS basket_cost_usd NUMERIC(18,8);

UPDATE inflacao_brasil.global_basket_references g
SET
    monthly_min_wage_usd = g.raw_monthly_min_wage * r.rate_to_usd,
    basket_cost_usd = g.raw_basket_cost * r.rate_to_usd,
    last_updated_at = NOW()
FROM inflacao_brasil.currency_exchange_rates r
WHERE r.currency_code = g.local_currency_code;

COMMIT;
