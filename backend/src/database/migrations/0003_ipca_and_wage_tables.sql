BEGIN;

-- Annual IPCA inflation index
CREATE TABLE IF NOT EXISTS inflacao_brasil.ipca_monthly (
    id BIGSERIAL PRIMARY KEY,
    effective_date DATE NOT NULL UNIQUE,
    annual_inflation_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ipca_monthly_effective_date
    ON inflacao_brasil.ipca_monthly (effective_date);

-- Minimum wage history with baseline work hours
CREATE TABLE IF NOT EXISTS inflacao_brasil.minimum_wage_history (
    id BIGSERIAL PRIMARY KEY,
    effective_from DATE NOT NULL UNIQUE,
    wage_amount NUMERIC(10,2) NOT NULL,
    work_hours_per_month INTEGER NOT NULL DEFAULT 220,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_minimum_wage_history_effective_from
    ON inflacao_brasil.minimum_wage_history (effective_from);

-- Seed data for IPCA (annual inflation %)
INSERT INTO inflacao_brasil.ipca_monthly (effective_date, annual_inflation_pct)
VALUES
    ('2022-12-01', 5.79),
    ('2023-12-01', 4.62),
    ('2024-12-01', 4.83),
    ('2025-12-01', 4.26)
ON CONFLICT (effective_date) DO NOTHING;

-- Seed data for minimum wage (monthly baseline: 220 hours)
INSERT INTO inflacao_brasil.minimum_wage_history (effective_from, wage_amount, work_hours_per_month)
VALUES
    ('2022-01-01', 1212.00, 220),
    ('2023-01-01', 1302.00, 220),
    ('2024-01-01', 1412.00, 220),
    ('2025-01-01', 1518.00, 220),
    ('2026-01-01', 1621.00, 220)
ON CONFLICT (effective_from) DO NOTHING;

COMMIT;
