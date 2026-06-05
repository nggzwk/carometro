import RankingGrid from "./RankingGrid";
import { getGlobalBasketRanking } from "../../../lib/globalBaskets";

export default async function Ranking() {
	const topRows = await getGlobalBasketRanking(10);
	const lastUpdatedAt = topRows[0]?.last_updated_at ?? null;

	return <RankingGrid rows={topRows} lastUpdatedAt={lastUpdatedAt} />;
}
