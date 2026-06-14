import { getItemLineSeries } from "../../../lib/itemLines";
import {
  getAnnualIpcaByYear,
  getCurrentYearIpcaYtd,
} from "../../../lib/annualInflation";
import { formatMonthName } from "../../../lib/formatters";
import LineGraphChart from "./LineGraphChart";

export default async function LineGraph() {
  const [series, ipcaByYear, ytd] = await Promise.all([
    getItemLineSeries(),
    getAnnualIpcaByYear(),
    getCurrentYearIpcaYtd(),
  ]);

  const ipcaPartial = ytd
    ? { year: ytd.year, label: `até ${formatMonthName(ytd.throughMonthRef)}` }
    : null;

  return (
    <LineGraphChart
      series={series}
      ipcaByYear={ipcaByYear}
      ipcaPartial={ipcaPartial}
    />
  );
}
