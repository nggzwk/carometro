import { BASICAO_SUBCATEGORIES } from "./basketIcons";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

type ItemsPriceApiResponse = {
  items: Array<{
    produto_subcategoria: number;
    month_ref: string;
    month_price: number | string | null;
  }>;
};

export type ItemLinePoint = {
  year: string;
  value: number | null;
  priceBrl: number | null;
};

export type ItemLineSeries = {
  subcategoria: number;
  points: ItemLinePoint[];
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildItemLineSeries(
  rows: ItemsPriceApiResponse["items"],
  currentYear: number,
): ItemLineSeries[] {
  // subcategoria -> { "YYYY-MM": price }
  const byItem = new Map<number, Map<string, number>>();
  for (const row of rows) {
    const price = toNumber(row.month_price);
    if (price === null || !row.month_ref) continue;
    let months = byItem.get(row.produto_subcategoria);
    if (!months) {
      months = new Map();
      byItem.set(row.produto_subcategoria, months);
    }
    months.set(row.month_ref, price);
  }

  return BASICAO_SUBCATEGORIES.map((subcategoria) => {
    const months = byItem.get(subcategoria);
    if (!months || months.size === 0) {
      return { subcategoria, points: [] };
    }

    const sortedRefs = [...months.keys()].sort();
    const years = [...new Set(sortedRefs.map((m) => Number(m.slice(0, 4))))]
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => a - b);

    if (years.length === 0) return { subcategoria, points: [] };

    const anchorByYear = new Map<number, number>();
    for (const year of years) {
      const monthsInYear = sortedRefs.filter((m) => m.startsWith(`${year}-`));
      const hasDecember = monthsInYear.includes(`${year}-12`);
      const isCurrentYearYtd = year === currentYear && !hasDecember;

      const anchorRef = isCurrentYearYtd
        ? monthsInYear[monthsInYear.length - 1]
        : `${year}-12`;
      const anchorPrice = anchorRef ? months.get(anchorRef) : undefined;
      if (anchorPrice !== undefined) anchorByYear.set(year, anchorPrice);
    }

    const plotYears = [...anchorByYear.keys()]
      .filter((year) => months.has(`${year - 1}-12`))
      .sort((a, b) => a - b);
    if (plotYears.length === 0) return { subcategoria, points: [] };

    const basePrice = months.get(`${plotYears[0] - 1}-12`);
    if (basePrice === undefined || basePrice === 0) {
      return { subcategoria, points: [] };
    }

    const points: ItemLinePoint[] = plotYears.map((year) => {
      const anchorPrice = anchorByYear.get(year) as number;
      const cumulativePct = ((anchorPrice - basePrice) / basePrice) * 100;
      return {
        year: String(year),
        value: Number(cumulativePct.toFixed(2)),
        priceBrl: Number(anchorPrice.toFixed(2)),
      };
    });

    return { subcategoria, points };
  });
}

export async function getItemLineSeries(): Promise<ItemLineSeries[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/basket/items/price`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as ItemsPriceApiResponse;
    const currentYear = new Date().getFullYear();
    return buildItemLineSeries(data.items ?? [], currentYear);
  } catch {
    return [];
  }
}
