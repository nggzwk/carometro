BEGIN;

-- Monthly IPCA values exposed in the public API.
CREATE TABLE IF NOT EXISTS inflacao_brasil.ipca_monthly_public (
    month_ref DATE PRIMARY KEY,
    monthly_inflation_pct NUMERIC(5,2) NOT NULL,
    source_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ipca_monthly_public_month_ref
    ON inflacao_brasil.ipca_monthly_public (month_ref);

-- Seed only the months we need for the public API.
INSERT INTO inflacao_brasil.ipca_monthly_public (
    month_ref,
    monthly_inflation_pct,
    source_url
)
VALUES
    ('2026-01-01', 0.33, 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json'),
    ('2026-02-01', 0.70, 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json'),
    ('2026-03-01', 0.88, 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json')
ON CONFLICT (month_ref) DO NOTHING;

COMMIT;
