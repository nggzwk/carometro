import { getItemLineSeries } from "../../../lib/itemLines";
import {
  getAnnualIpcaByYear,
  getAnnualMinimumWageIncrease,
  getBaseMinimumWage,
  getCurrentYearIpcaYtd,
} from "../../../lib/annualInflation";
import { formatMonthName } from "../../../lib/formatters";
import LineGraphChart from "./LineGraphChart";

export default async function LineGraph() {
  const [series, ipcaByYear, ytd, wageByYear, baseSalary] = await Promise.all([
    getItemLineSeries(),
    getAnnualIpcaByYear(),
    getCurrentYearIpcaYtd(),
    getAnnualMinimumWageIncrease(),
    getBaseMinimumWage(),
  ]);

  const ipcaPartial = ytd
    ? { year: ytd.year, label: `até ${formatMonthName(ytd.throughMonthRef)}` }
    : null;

  return (
    <LineGraphChart
      series={series}
      ipcaByYear={ipcaByYear}
      ipcaPartial={ipcaPartial}
      wageByYear={wageByYear ?? {}}
      baseSalary={baseSalary ?? 0}
    />
  );
}
