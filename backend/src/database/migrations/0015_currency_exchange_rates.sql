BEGIN;

CREATE TABLE IF NOT EXISTS inflacao_brasil.currency_exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_code VARCHAR(3) UNIQUE NOT NULL,
    rate_to_usd NUMERIC(18,8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMIT;
