const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export type GlobalBasketRow = {
	id: number;
	country_region: string;
	responsible_authority: string;
	raw_monthly_min_wage: number | string;
	raw_basket_cost: number | string;
	workweek_hours: number;
	last_updated_at: string | null;
	rate_to_usd: number | string | null;
	rate_updated_at: string | null;
	monthly_min_wage_usd: number | string | null;
	basket_cost_usd: number | string | null;
	monthly_min_wage_brl: number | string | null;
	basket_cost_brl: number | string | null;
};

export type GlobalBasketRankingRow = GlobalBasketRow & {
	rank: number;
	basket_usd: number;
	wage_pct: number;
	hours_needed: number;
};

function toNumber(value: number | string | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatUsd(value: number | null): string {
	if (value === null) return "-";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(value);
}

export function formatPercent(value: number | null): string {
	if (value === null) return "-";
	return `${value.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}%`;
}

export function formatHours(value: number | null): string {
	if (value === null) return "-";
	return `${value.toLocaleString("pt-BR", {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})} h`;
}

function toRankingMetrics(row: GlobalBasketRow): Omit<GlobalBasketRankingRow, "rank"> | null {
	const basketUsd = toNumber(row.basket_cost_usd);
	const wageUsd = toNumber(row.monthly_min_wage_usd);
	if (basketUsd === null || wageUsd === null || wageUsd === 0) {
		return null;
	}

	const monthlyHours = row.workweek_hours * (52 / 12);
	const wagePct = (basketUsd / wageUsd) * 100;
	const hoursNeeded = (basketUsd / wageUsd) * monthlyHours;

	return {
		...row,
		basket_usd: basketUsd,
		wage_pct: wagePct,
		hours_needed: hoursNeeded,
	};
}

export async function getGlobalBasketRanking(limit = 10): Promise<GlobalBasketRankingRow[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/api/global-baskets`, {
			next: { revalidate: 604800 },
		});

		if (!res.ok) return [];

		const data = (await res.json()) as GlobalBasketRow[];
		return data
			.map((row) => ({
				...row,
				basket_cost_usd: row.basket_cost_usd,
				monthly_min_wage_usd: row.monthly_min_wage_usd,
			}))
			.map((row) => toRankingMetrics(row))
			.filter((row): row is Omit<GlobalBasketRankingRow, "rank"> => row !== null)
			.sort((left, right) => {
				if (left.wage_pct !== right.wage_pct) {
					return right.wage_pct - left.wage_pct;
				}
				if (left.basket_usd !== right.basket_usd) {
					return right.basket_usd - left.basket_usd;
				}
				return left.id - right.id;
			})
			.slice(0, limit)
			.map((row, index) => ({
				...row,
				rank: index + 1,
			}));
	} catch {
		return [];
	}
}

const countryNamesPt: Record<string, string> = {
	Brazil: "Brasil",
	Germany: "Alemanha",
	USA: "EUA",
	Argentina: "Argentina",
	Chile: "Chile",
	India: "Índia",
	Portugal: "Portugal",
	Russia: "Rússia",
	Paraguay: "Paraguai",
	China: "China",
};

export function translateCountry(name: string): string {
	return countryNamesPt[name] ?? name;
}
