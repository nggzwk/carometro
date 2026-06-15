import getAnnualInflation, {
  getMinimumWageByYear,
  getCurrentYearIpcaYtd,
  type AnnualRow,
  type CurrentYearIpcaYtd,
} from "../../../lib/annualInflation";
import AxisGraphChart, { type DataPoint } from "./AxisGraphChart";
import { formatMonthName } from "../../../lib/formatters";

function compound(cumulative: number, annual: number): number {
  return (1 + cumulative / 100) * (1 + annual / 100) * 100 - 100;
}

function buildSeries(
  rows: AnnualRow[],
  basePrice: number,
  ipcaYtd: CurrentYearIpcaYtd | null,
): DataPoint[] {
  let cumulativeIpca = 0;
  let cumulativeWage = 0;
  let cumulativeDieese = 0;

  // The first year is the start of the calculus: every series is 0% there and
  // accumulates from the following year.
  return rows.map((r, i) => {
    const isYtdYear = ipcaYtd !== null && r.year === ipcaYtd.year;
    const ipcaIsYtd = isYtdYear && r.annual_ipca_pct === null;
    const annualIpca = ipcaIsYtd
      ? ipcaYtd!.pct
      : r.annual_ipca_pct === null
        ? null
        : Number(r.annual_ipca_pct);
    const annualWage =
      r.annual_minimum_wage_increase_pct == null
        ? null
        : Number(r.annual_minimum_wage_increase_pct);
    const annualDieese =
      r.annual_inflation_pct === null ? null : Number(r.annual_inflation_pct);

    if (annualIpca !== null)
      cumulativeIpca = i === 0 ? 0 : compound(cumulativeIpca, annualIpca);
    if (annualWage !== null)
      cumulativeWage = i === 0 ? 0 : compound(cumulativeWage, annualWage);
    if (annualDieese !== null)
      cumulativeDieese = i === 0 ? 0 : compound(cumulativeDieese, annualDieese);

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
      ipcaPartialLabel:
        isYtdYear && annualIpca !== null
          ? `até ${formatMonthName(ipcaYtd!.throughMonthRef)}`
          : null,
      wageIncrease:
        annualWage !== null ? Number(cumulativeWage.toFixed(2)) : null,
      wagePartialLabel: i === 0 && annualWage !== null ? "início do cálculo" : null,
    };
  });
}

export default async function AxisGraph() {
  const [rows, wageByYear, ipcaYtd] = await Promise.all([
    getAnnualInflation(),
    getMinimumWageByYear(),
    getCurrentYearIpcaYtd(),
  ]);

  // The first year is the base (0%), so prices/wages are measured from it.
  const baseYear = Number(rows?.[0]?.year);
  const basePrice = Number(rows?.[0]?.end_month_value_brl ?? 0);
  const baseSalary = wageByYear[baseYear] ?? 0;
  const data = buildSeries(rows ?? [], basePrice, ipcaYtd);

  return (
    <AxisGraphChart data={data} basePrice={basePrice} baseSalary={baseSalary} />
  );
}
