const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

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

export function calculateAnnualMinimumWageIncrease(
  wageRows: WageRow[],
): Record<number, number | null> {
  const latestWageByYear = wageRows.reduce<Record<number, number>>((acc, row) => {
    const year = getYearFromMonthRef(row.month_ref);
    const wage = toNumber(row.minimum_wage_brl);
    if (year === null || wage === null) return acc;

    const current = acc[year];
    if (current === undefined || wage > current) {
      acc[year] = wage;
    }
    return acc;
  }, {});

  const years = Object.keys(latestWageByYear)
    .map((y) => Number(y))
    .sort((a, b) => a - b);

  const increaseByYear: Record<number, number | null> = {};
  for (const year of years) {
    const currentWage = latestWageByYear[year];
    const previousWage = latestWageByYear[year - 1];

    if (previousWage === undefined || previousWage === 0) {
      increaseByYear[year] = null;
      continue;
    }

    const increasePct = ((currentWage - previousWage) / previousWage) * 100;
    increaseByYear[year] = Number(increasePct.toFixed(2));
  }

  return increaseByYear;
}

export async function getAnnualMinimumWageIncrease(): Promise<
  Record<number, number | null> | null
> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/basket/wage`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const wageRows = (await res.json()) as WageRow[];
    return calculateAnnualMinimumWageIncrease(wageRows);
  } catch {
    return null;
  }
}

export async function getAnnualInflation(): Promise<AnnualRow[] | null> {
  try {
    const [inflationRes, wageIncreaseByYear] = await Promise.all([
      fetch(`${API_BASE_URL}/api/global-baskets/dieese/inflation/annual`, {
        cache: "no-store",
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

export default getAnnualInflation;

