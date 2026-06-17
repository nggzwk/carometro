# Carômetro — Inflação Brasil

[![CI](https://github.com/nggzwk/carometro/actions/workflows/ci.yml/badge.svg)](https://github.com/nggzwk/carometro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-blue.svg)](https://creativecommons.org/licenses/by/4.0/deed.en)
[![Live](https://img.shields.io/badge/live-ocarometro.com-2ea44f)](https://ocarometro.com)

Tracks how grocery prices are rising in **Curitiba, Brazil**, month by month.
It collects raw price quotes for a fixed basket of products, turns them into a
clean monthly time series, computes inflation metrics (per item, per basket, vs.
IPCA and minimum wage), and serves it all through a dashboard at
[ocarometro.com](https://ocarometro.com).

The basket is tracked in three flavours:

- **Basicão / mercado** — the supermarket basket.
- **Feirão / hortifruti** — the street-market vegetable basket.
- **Global baskets** — DIEESE basket plus international comparisons (USD value,
  USA CPI, Argentina SMVM) for cross-country context.

<p align="center">
  <a href="https://ocarometro.com">
    <img src="frontend/public/screenshot.png" alt="Carômetro dashboard" width="820" />
  </a>
</p>

---

## Contents

- [Architecture](#architecture)
- [Data source](#data-source)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [API overview](#api-overview)
- [Scheduled data refresh (crons)](#scheduled-data-refresh-crons)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)
- [Contributing](#contributing)

---

## Architecture

The repo is a monorepo with three independent pieces plus scheduled jobs:

```
┌──────────────────┐   monthly/weekly/daily   ┌─────────────────────┐
│  data-pipeline   │ ───── GitHub Actions ───▶ │  PostgreSQL (Railway)│
│ download→clean→  │      (crons, see below)   │  schema:             │
│ standardize→load │                           │  inflacao_brasil     │
└──────────────────┘                           └──────────┬──────────┘
                                                          │ reads
┌──────────────────┐      HTTP (REST/JSON)     ┌──────────▼──────────┐
│ frontend (Next)  │ ◀──────────────────────── │  backend (FastAPI)  │
│ App Router, ISR  │      GET /api/...          │  read-only API      │
└──────────────────┘                           └─────────────────────┘
```

| Directory       | Stack                          | Role |
| --------------- | ------------------------------ | ---- |
| `data-pipeline/`| Python, pandas                 | Download raw monthly price sheets, clean + standardize them, build the monthly item series, and load it into Postgres. |
| `backend/`      | Python, FastAPI, SQLAlchemy    | Read-only REST API over the Postgres data + the basket-calculus scripts and DB migrations. |
| `frontend/`     | Next.js 16 (App Router), React, Tailwind, Recharts | The public dashboard. Server components fetch from the API with ISR caching. |
| `project/`      | Python                         | Tiny `uvicorn` launcher for running the backend locally. |
| `.github/workflows/` | GitHub Actions            | CI + the scheduled data-refresh cron jobs. |

All three services share one PostgreSQL database (schema `inflacao_brasil`). The
data-pipeline and the cron scripts **write**; the backend **reads**.

---

## Data source

Raw price quotes come from **Curitiba's open-data programme _Clique Economia_**,
published as monthly CSV sheets on the city's open-data portal hosted by
UFPR/C3SL:

- <https://dadosabertos.c3sl.ufpr.br/curitiba/CliqueEconomia/>
- <https://mid-dadosabertos.curitiba.pr.gov.br/CliqueEconomia/>

The pipeline downloads these sheets, cleans and standardizes the (often messy)
columns, maps products to a stable subcategory taxonomy, and builds the monthly
item price series. Official inflation references are pulled from public sources
too — **IPCA** from the Banco Central do Brasil (BCB) API, plus exchange rates,
USA CPI and Argentina's SMVM for the international comparisons.

> **Access & use.** Public data from the Portal de Dados Abertos de Curitiba,
> freely available to any individual or organization and released as Open Data
> under [**CC BY 4.0**](https://creativecommons.org/licenses/by/4.0/deed.en).
> Per the portal's _Acesso e uso_ terms,
> once the data has been downloaded the city and its agencies assume no
> responsibility for its authenticity, quality, or timeliness. Carômetro is an
> independent analysis and is not affiliated with the Municipality of Curitiba or
> DIEESE; any processing errors are its own.

---

## Prerequisites

- **Python 3.13**
- **Node.js 20+**
- **PostgreSQL 14+** running locally (or a connection string to a hosted one)

---

## Environment variables

Create a `.env` in the repo root (it is git-ignored — never commit it):

```bash
# Postgres connection used by the backend, pipeline and migration runner
DATABASE_URL=postgresql://inflacao_app:password@localhost:5432/inflacao_brasil

# Only needed for the exchange-rate refresh worker
EXCHANGE_RATE_API_KEY=your_exchangerate_api_key
```

Frontend (`frontend/.env.local`):

```bash
# Where the frontend's server components fetch data from (defaults to localhost:8000)
API_BASE_URL=http://localhost:8000
```

> The backend also reads `ALLOWED_ORIGINS` (comma-separated CORS allowlist,
> defaults to localhost + the production domains).

---

## Running locally

### 1. Database + migrations

With Postgres running and `DATABASE_URL` set, apply the migrations (idempotent,
tracked in `inflacao_brasil.migrations_applied`):

```bash
python backend/run_migrations.py
```

### 2. Backend API

```bash
pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# from the repo root — the launcher fixes up the import path and enables reload
python project/main.py
# → http://localhost:8000   (interactive docs at /docs)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

The dashboard will be empty until the database has data — see the next section.

### 4. (Optional) Load data

The pipeline downloads source sheets, cleans/standardizes them, builds the
monthly series, then runs the basket-calculus scripts. The steps mirror the
[monthly cron](.github/workflows/cron-monthly-pipeline.yml):

```bash
pip install -r data-pipeline/requirements.txt

# process_data.py uses relative imports, so run it from its own dir
cd data-pipeline/scripts
python process_data.py download --dataset cotacoes_new
python process_data.py process  --dataset cotacoes_new
cd -

python data-pipeline/scripts/csv_cleaner/standardize/standardize.py \
  --input  data-pipeline/data/cleaned/new_format \
  --output data-pipeline/data/standardized

python data-pipeline/scripts/build_monthly_item_series.py

python backend/scripts/calculate_basket_values.py
python backend/scripts/calculate_vegetable_basket.py
python backend/scripts/calculate_dieese_basket.py
```

---

## API overview

Base URL: `http://localhost:8000`. Responses are JSON; rate-limited to
60 req/min per IP. Full interactive docs at `/docs`.

| Prefix                   | Example endpoints |
| ------------------------ | ----------------- |
| `/api/basket`            | `/items/price`, `/inflation/month`, `/inflation/annual`, `/villains`, `/wage`, `/hours` |
| `/api/vegetable-basket`  | same shape as `/api/basket`, for the feirão/hortifruti basket |
| `/api/global-baskets`    | `/`, `/dieese`, `/dieese/wage`, `/dieese/inflation/annual` |
| `/health`                | `HEAD` health check |

Most price endpoints accept an optional `?month_ref=YYYY-MM` to query a specific
month; omit it for the latest.

---

## Scheduled data refresh (crons)

Three GitHub Actions keep the data current (they write directly to the Railway
Postgres via the `DATABASE_RAILWAY` secret):

| Workflow | Schedule | What it does |
| -------- | -------- | ------------ |
| [`cron-monthly-pipeline.yml`](.github/workflows/cron-monthly-pipeline.yml) | 1st of each month, 06:00 UTC | Full pipeline: download → clean → standardize → build series → basket calculus. |
| [`cron-ipca.yml`](.github/workflows/cron-ipca.yml) | Daily, 8th–18th, 11:00 UTC | Syncs the official IPCA index from the BCB API once it's published (idempotent no-op until then). |
| [`cron-weekly-exchange.yml`](.github/workflows/cron-weekly-exchange.yml) | Mondays, 07:00 UTC | Refreshes exchange rates, USD basket values, Argentina SMVM, and USA CPI. |

Each can also be triggered manually via `workflow_dispatch`.

### Caching

The frontend's server fetches use ISR (`next: { revalidate: ... }`, 1–7 days
depending on the endpoint), so a page can lag behind a fresh pipeline run until
its cache window expires. Since the data only changes on the cron schedule
(monthly/weekly/daily), this is an acceptable trade-off for cache efficiency.

---

## Testing

```bash
# Backend unit tests
python -m pytest backend/tests

# Frontend unit tests (Vitest)
cd frontend && npm run test

# Frontend end-to-end + API tests (Playwright, run against a deployed env)
cd frontend && npx playwright test
```

CI ([`ci.yml`](.github/workflows/ci.yml)) runs on every push to a non-main branch
and every PR into `main`: Semgrep code scan, backend pytest, frontend Vitest, and
Playwright e2e/API. `main` is protected — changes land via PR once checks pass.

---

## Deployment

- **Frontend** — Vercel (the app uses `@vercel/analytics`).
- **Backend** — any container/PaaS host; the `Procfile` runs
  `uvicorn src.api.app:app`.
- **Database** — Railway PostgreSQL.

---

## License

Released under the **MIT License** — see [`LICENSE`](LICENSE). You're free to
use, copy, modify, and redistribute the code (including commercially), as long
as you keep the copyright and license notice.

## Contributing

Contributions are welcome! By opening a pull request you agree to license your
contribution under the same MIT License.

1. Fork the repo and create a feature branch off `main`.
2. Make your change and run the relevant test suites (see [Testing](#testing)).
3. Open a PR into `main`. CI (Semgrep, backend pytest, frontend Vitest,
   Playwright e2e/API) must be green before it can merge — `main` is protected.
