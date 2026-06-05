BEGIN;

CREATE TABLE IF NOT EXISTS inflacao_brasil.vegetable_basket_item (
    id                     SERIAL      PRIMARY KEY,
    primary_subcategoria   INT         NOT NULL,
    fallback_subcategoria  INT,
    unit_sigla             VARCHAR(10) NOT NULL DEFAULT 'KG',
    sort_order             INT         NOT NULL DEFAULT 0
);

INSERT INTO inflacao_brasil.vegetable_basket_item
    (primary_subcategoria, fallback_subcategoria, unit_sigla, sort_order)
VALUES
    (50008, 50009, 'KG',    1),
    (50025, 50024, 'KG',    2),
    (50005, NULL,  'KG',    3),
    (50002, NULL,  'KG',    4),
    (50079, 50080, 'PC/UN', 5),
    (50007, NULL,  'KG',    6),
    (50021, NULL,  'KG',    7),
    (50017, NULL,  'KG',    8),
    (50029, 50028, 'KG',    9),
    (50004, NULL,  'KG',   10)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS inflacao_brasil.vegetable_basket_monthly_value (
    id                 BIGSERIAL     PRIMARY KEY,
    month_ref          VARCHAR(7)    NOT NULL UNIQUE,
    basket_value_brl   NUMERIC(14,4) NOT NULL,
    minimum_wage_brl   NUMERIC(14,4),
    percentage_of_wage NUMERIC(10,2),
    calculated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_veg_basket_monthly_month
    ON inflacao_brasil.vegetable_basket_monthly_value (month_ref);

COMMIT;
