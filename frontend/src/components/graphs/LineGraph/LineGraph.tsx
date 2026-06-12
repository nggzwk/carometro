import { getItemLineSeries } from "../../../lib/itemLines";
import LineGraphChart from "./LineGraphChart";

export default async function LineGraph() {
  const series = await getItemLineSeries();

  return <LineGraphChart series={series} />;
}
