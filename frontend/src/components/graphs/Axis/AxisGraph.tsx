import getAnnualInflation, {
  getBaseMinimumWage,
  type AnnualRow,
} from "../../../lib/annualInflation";
import AxisGraphChart, { type DataPoint } from "./AxisGraphChart";

function compound(cumulative: number, annual: number, isFirst: boolean): number {
  return isFirst
    ? annual
    : (1 + cumulative / 100) * (1 + annual / 100) * 100 - 100;
}

function buildSeries(rows: AnnualRow[], basePrice: number): DataPoint[] {
  let cumulativeIpca = 0;
  let cumulativeWage = 0;
  let cumulativeDieese = 0;

  return rows.map((r, i) => {
    const annualIpca =
      r.annual_ipca_pct === null ? null : Number(r.annual_ipca_pct);
    const annualWage =
      r.annual_minimum_wage_increase_pct == null
        ? null
        : Number(r.annual_minimum_wage_increase_pct);
    const annualDieese =
      r.annual_inflation_pct === null ? null : Number(r.annual_inflation_pct);

    if (annualIpca !== null)
      cumulativeIpca = compound(cumulativeIpca, annualIpca, i === 0);
    if (annualWage !== null)
      cumulativeWage = compound(cumulativeWage, annualWage, i === 0);
    if (annualDieese !== null)
      cumulativeDieese = compound(cumulativeDieese, annualDieese, i === 0);

    const endPrice =
      r.end_month_value_brl === null ? null : Number(r.end_month_value_brl);
    const basketGrowth =
      endPrice === null || basePrice === 0
        ? null
        : ((endPrice - basePrice) / basePrice) * 100;

    return {
      year: String(r.year),
      value: basketGrowth !== null ? Number(basketGrowth.toFixed(2)) : null,
      inflation:
        annualDieese !== null ? Number(cumulativeDieese.toFixed(2)) : null,
      ipca: annualIpca !== null ? Number(cumulativeIpca.toFixed(2)) : null,
      wageIncrease:
        annualWage !== null ? Number(cumulativeWage.toFixed(2)) : null,
    };
  });
}

export default async function AxisGraph() {
  const [rows, baseWage] = await Promise.all([
    getAnnualInflation(),
    getBaseMinimumWage(),
  ]);

  const basePrice = Number(rows?.[0]?.start_month_value_brl ?? 0);
  const baseSalary = baseWage ?? 0;
  const data = buildSeries(rows ?? [], basePrice);

  return (
    <AxisGraphChart data={data} basePrice={basePrice} baseSalary={baseSalary} />
  );
}
