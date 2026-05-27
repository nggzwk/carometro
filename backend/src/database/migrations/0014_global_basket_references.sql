BEGIN;

CREATE TABLE IF NOT EXISTS inflacao_brasil.global_basket_references (
    id BIGINT PRIMARY KEY,
    country_region TEXT NOT NULL,
    responsible_authority TEXT NOT NULL,
    local_currency_code CHAR(3) NOT NULL,
    raw_monthly_min_wage NUMERIC(14,2) NOT NULL,
    raw_basket_cost NUMERIC(14,2) NOT NULL,
    workweek_hours INTEGER NOT NULL,
    last_updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO inflacao_brasil.global_basket_references (
    id,
    country_region,
    responsible_authority,
    local_currency_code,
    raw_monthly_min_wage,
    raw_basket_cost,
    workweek_hours,
    last_updated_at
)
VALUES
    (1, 'USA', 'USDA (Thrifty Food Plan)', 'USD', 1256.00, 280.00, 40, NOW()),
    (2, 'Germany', 'BMAS / Destatis', 'EUR', 2410.00, 210.00, 40, NOW()),
    (3, 'Portugal', 'DGS / INE', 'EUR', 920.00, 150.00, 40, NOW()),
    (4, 'Russia', 'Rosstat', 'RUB', 30000.00, 7800.00, 40, NOW()),
    (5, 'China', 'NBS / NHC', 'CNY', 2740.00, 835.00, 40, NOW()),
    (6, 'India', 'ICMR / NIN', 'INR', 13520.00, 3800.00, 48, NOW()),
    (7, 'Argentina', 'INDEC', 'ARS', 363000.00, 215228.00, 48, NOW()),
    (8, 'Chile', 'INE', 'CLP', 539000.00, 70522.00, 40, NOW()),
    (9, 'Paraguay', 'INE', 'PYG', 3100000.00, 450000.00, 48, NOW()),
    (10, 'Brazil', 'DIEESE', 'BRL', 1621.00, 0.00, 40, NOW())
ON CONFLICT (id) DO UPDATE
SET
    country_region = EXCLUDED.country_region,
    responsible_authority = EXCLUDED.responsible_authority,
    local_currency_code = EXCLUDED.local_currency_code,
    raw_monthly_min_wage = EXCLUDED.raw_monthly_min_wage,
    raw_basket_cost = EXCLUDED.raw_basket_cost,
    workweek_hours = EXCLUDED.workweek_hours,
    last_updated_at = EXCLUDED.last_updated_at;

COMMIT;