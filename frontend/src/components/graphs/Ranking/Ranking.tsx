import RankingGrid from "./RankingGrid";
import { getGlobalBasketRanking } from "../../../lib/globalBaskets";

export default async function Ranking() {
	const topRows = await getGlobalBasketRanking(10);

	return <RankingGrid rows={topRows} />;
}
