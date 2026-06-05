
BEGIN;

CREATE TABLE IF NOT EXISTS inflacao_brasil.usa_basket_cpi_monthly (
    month_ref     CHAR(7)        PRIMARY KEY,
    basket_usd    NUMERIC(14,2)  NOT NULL,
    cpi_index     NUMERIC(10,4)  NOT NULL,
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


INSERT INTO inflacao_brasil.usa_basket_cpi_monthly (month_ref, basket_usd, cpi_index)
VALUES ('2024-01', 280.00, 0.0000)
ON CONFLICT DO NOTHING;

COMMIT;