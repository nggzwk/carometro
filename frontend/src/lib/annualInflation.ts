const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:8000";

export type AnnualRow = {
  year: number;
  start_month_ref: string | null;
  start_month_value_brl: number | null;
  end_month_ref: string | null;
  end_month_value_brl: number | null;
  annual_difference_brl: number | null;
  annual_inflation_pct: number | null;
  annual_ipca_pct: number | null;
  annual_minimum_wage_increase_pct: number | null;
};

type WageRow = {
  month_ref: string;
  basket_value_brl: number | string;
  minimum_wage_brl: number | string | null;
  percentage_of_wage: number | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getYearFromMonthRef(monthRef: string): number | null {
  const year = Number(String(monthRef).slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function latestWageByYear(wageRows: WageRow[]): Record<number, number> {
  return wageRows.reduce<Record<number, number>>((acc, row) => {
    const year = getYearFromMonthRef(row.month_ref);
    const wage = toNumber(row.minimum_wage_brl);
    if (year === null || wage === null) return acc;

    const current = acc[year];
    if (current === undefined || wage > current) {
      acc[year] = wage;
    }
    return acc;
  }, {});
}

export function calculateAnnualMinimumWageIncrease(
  wageRows: WageRow[],
): Record<number, number | null> {
  const wageByYear = latestWageByYear(wageRows);

  const years = Object.keys(wageByYear)
    .map((y) => Number(y))
    .sort((a, b) => a - b);

  const increaseByYear: Record<number, number | null> = {};
  for (const year of years) {
    const currentWage = wageByYear[year];
    const previousWage = wageByYear[year - 1];

    if (previousWage === undefined || previousWage === 0) {
      increaseByYear[year] = null;
      continue;
    }

    const increasePct = ((currentWage - previousWage) / previousWage) * 100;
    increaseByYear[year] = Number(increasePct.toFixed(2));
  }

  return increaseByYear;
}

export async function getAnnualMinimumWageIncrease(): Promise<Record<
  number,
  number | null
> | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/basket/wage`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const wageRows = (await res.json()) as WageRow[];
    return calculateAnnualMinimumWageIncrease(wageRows);
  } catch {
    return null;
  }
}

export async function getMinimumWageByYear(): Promise<Record<number, number>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/basket/wage`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};

    const wageRows = (await res.json()) as WageRow[];
    return latestWageByYear(wageRows);
  } catch {
    return {};
  }
}

export async function getAnnualInflation(): Promise<AnnualRow[] | null> {
  try {
    const [inflationRes, wageIncreaseByYear] = await Promise.all([
      fetch(`${API_BASE_URL}/api/global-baskets/dieese/inflation/annual`, {
        next: { revalidate: 86400 },
      }),
      getAnnualMinimumWageIncrease(),
    ]);

    if (!inflationRes.ok) return null;

    const data = (await inflationRes.json()) as AnnualRow[];

    return data.map((r) => ({
      ...r,
      year: Number(r.year),
      start_month_value_brl: toNumber(r.start_month_value_brl),
      end_month_value_brl: toNumber(r.end_month_value_brl),
      annual_difference_brl: toNumber(r.annual_difference_brl),
      annual_inflation_pct: toNumber(r.annual_inflation_pct),
      annual_ipca_pct: toNumber(r.annual_ipca_pct),
      annual_minimum_wage_increase_pct:
        wageIncreaseByYear?.[Number(r.year)] ?? null,
    }));
  } catch {
    return null;
  }
}

export type CurrentYearIpcaYtd = {
  year: number;
  pct: number;
  throughMonthRef: string;
};

export async function getCurrentYearIpcaYtd(): Promise<CurrentYearIpcaYtd | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/basket/inflation/month`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{
      month_ref: string;
      ipca_monthly_pct: number | null;
    }>;

    const withIpca = rows
      .filter((r) => r.month_ref && toNumber(r.ipca_monthly_pct) !== null)
      .sort((a, b) => String(a.month_ref).localeCompare(String(b.month_ref)));

    if (withIpca.length === 0) return null;

    // Year of the most recent month that has an IPCA value.
    const latestRef = withIpca[withIpca.length - 1].month_ref;
    const year = Number(String(latestRef).slice(0, 4));

    const monthly = withIpca.filter((r) =>
      String(r.month_ref).startsWith(`${year}-`),
    );

    const factor = monthly.reduce(
      (acc, r) => acc * (1 + Number(r.ipca_monthly_pct) / 100),
      1,
    );
    const pct = Number(((factor - 1) * 100).toFixed(2));

    return { year, pct, throughMonthRef: monthly[monthly.length - 1].month_ref };
  } catch {
    return null;
  }
}

export async function getAnnualIpcaByYear(): Promise<Record<number, number>> {
  const [rows, ytd] = await Promise.all([
    getAnnualInflation(),
    getCurrentYearIpcaYtd(),
  ]);

  const map: Record<number, number> = {};
  for (const r of rows ?? []) {
    if (r.annual_ipca_pct !== null) map[r.year] = Number(r.annual_ipca_pct);
  }
  if (ytd && map[ytd.year] === undefined) map[ytd.year] = ytd.pct;
  return map;
}

export type DieeseRow = { year: string; annual: string; cumulative: string };

function formatPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}
export async function getDieeseTableRows(): Promise<DieeseRow[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/global-baskets/dieese/inflation/annual`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as AnnualRow[];

    let cumulative = 0;
    return data.map((r, i) => {
      const annual = toNumber(r.annual_inflation_pct);
      if (annual !== null) {
        cumulative =
          i === 0
            ? 0
            : (1 + cumulative / 100) * (1 + annual / 100) * 100 - 100;
      }
      return {
        year: String(r.year),
        annual: annual !== null ? formatPct(annual) : "—",
        cumulative: annual !== null ? formatPct(cumulative) : "—",
      };
    });
  } catch {
    return [];
  }
}

export default getAnnualInflation;
