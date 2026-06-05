BEGIN;

CREATE TABLE IF NOT EXISTS inflacao_brasil.currency_exchange_rates_history (
    id            SERIAL          PRIMARY KEY,
    currency_code VARCHAR(3)      NOT NULL,
    rate_to_usd   NUMERIC(18,8)   NOT NULL,
    rate_date     DATE            NOT NULL DEFAULT CURRENT_DATE,
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (currency_code, rate_date)
);

COMMIT;
