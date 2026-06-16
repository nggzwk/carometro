import {
  getItemLineSeries,
  getFeiraoItemLineSeries,
} from "../../../lib/itemLines";
import {
  getAnnualIpcaByYear,
  getAnnualMinimumWageIncrease,
  getMinimumWageByYear,
  getCurrentYearIpcaYtd,
} from "../../../lib/annualInflation";
import { formatMonthName } from "../../../lib/formatters";
import LineGraphChart from "./LineGraphChart";

export default async function LineGraph() {
  const [series, feiraoSeries, ipcaByYear, ytd, wageByYear, wageByYearAmount] =
    await Promise.all([
      getItemLineSeries(),
      getFeiraoItemLineSeries(),
      getAnnualIpcaByYear(),
      getCurrentYearIpcaYtd(),
      getAnnualMinimumWageIncrease(),
      getMinimumWageByYear(),
    ]);

  const ipcaPartial = ytd
    ? { year: ytd.year, label: `até ${formatMonthName(ytd.throughMonthRef)}` }
    : null;

  const itemYears = [...series, ...feiraoSeries].flatMap((s) =>
    s.points.map((p) => Number(p.year)),
  );
  const baseYear = itemYears.length ? Math.min(...itemYears) : null;
  const baseSalary =
    baseYear !== null ? (wageByYearAmount[baseYear] ?? 0) : 0;

  return (
    <LineGraphChart
      series={series}
      feiraoSeries={feiraoSeries}
      ipcaByYear={ipcaByYear}
      ipcaPartial={ipcaPartial}
      wageByYear={wageByYear ?? {}}
      baseSalary={baseSalary ?? 0}
    />
  );
}
