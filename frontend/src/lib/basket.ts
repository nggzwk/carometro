import type { BasketSummaryProps } from "./basketTypes";

export type BasketItemsApiResponse = {
  items: Array<{
    produto_categoria: number;
    produto_subcategoria: number;
    item_name: string;
    qtd_embalagem: string;
    month_ref: string;
    month_price: number | string | null;
    previous_price: number | string | null;
    mom_pct: number | null;
    ipca_monthly_pct: number | null;
  }>;
};

type BasketInflationApiResponse = Array<{
  month_ref: string;
  basket_difference_brl: number;
  inflation_pct: number | null;
  ipca_monthly_pct: number | null;
  annual_ipca_pct: number | null;
}>;

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function getAvailableMonths(year: number): Promise<string[]> {
  const now = new Date();
  const lastMonth = year < now.getFullYear() ? 12 : now.getMonth() + 1;

  const results = await Promise.all(
    Array.from({ length: lastMonth }, (_, i) => {
      const month_ref = `${year}-${String(i + 1).padStart(2, "0")}`;
      return fetch(`${API_BASE_URL}/api/basket/items/price?month_ref=${month_ref}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return null;
          const { items } = (await res.json()) as BasketItemsApiResponse;
          const ref = items[0]?.month_ref;
          return ref?.startsWith(`${year}-`) ? ref.slice(0, 7) : null;
        })
        .catch(() => null);
    })
  );

  return [...new Set(results.filter(Boolean) as string[])].sort();
}


export async function getBasketDataForMonth(
  month_ref: string
): Promise<BasketSummaryProps | null> {
  try {
    const [itemsRes, inflationRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/basket/items/price?month_ref=${month_ref}`, {
        cache: "no-store",
      }),
      fetch(
        `${API_BASE_URL}/api/basket/inflation/month?month_ref=${month_ref}`,
        { cache: "no-store" }
      ),
    ]);

    if (!itemsRes.ok) return null;

    const itemsData = (await itemsRes.json()) as BasketItemsApiResponse;
    const inflationData = inflationRes.ok
      ? ((await inflationRes.json()) as BasketInflationApiResponse)
      : [];

    const latestInflation = inflationData[0];

    return {
      items: itemsData.items.map((item) => ({
        ...item,
        month_price: item.month_price === null ? "0" : String(item.month_price),
        previous_price:
          item.previous_price === null ? null : String(item.previous_price),
      })),
      totalValue: latestInflation?.basket_difference_brl ?? 0,
      totalInflationPct: latestInflation?.inflation_pct ?? 0,
      monthlyIpca: latestInflation?.ipca_monthly_pct ?? null,
      annualIpca: latestInflation?.annual_ipca_pct ?? null,
    };
  } catch {
    return null;
  }
}

export async function getBasketSummaryProps(): Promise<BasketSummaryProps> {
  try {
    const [itemsResponse, inflationResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/basket/items/price`, {
        cache: "no-store",
      }),
      fetch(`${API_BASE_URL}/api/basket/inflation/month`, {
        cache: "no-store",
      }),
    ]);

    if (!itemsResponse.ok || !inflationResponse.ok) {
      return {
        items: [],
        totalValue: 0,
        totalInflationPct: 0,
        monthlyIpca: null,
        annualIpca: null,
      };
    }

    const itemsData = (await itemsResponse.json()) as BasketItemsApiResponse;
    const inflationData = (await inflationResponse.json()) as BasketInflationApiResponse;

    const firstItem = itemsData.items[0];
    const latestInflation = inflationData[0];

    return {
      items: itemsData.items.map((item) => ({
        ...item,
        month_price: item.month_price === null ? "0" : String(item.month_price),
        previous_price:
          item.previous_price === null ? null : String(item.previous_price),
      })),
      totalValue: latestInflation?.basket_difference_brl ?? 0,
      totalInflationPct: latestInflation?.inflation_pct ?? 0,
      monthlyIpca: firstItem?.ipca_monthly_pct ?? latestInflation?.ipca_monthly_pct ?? null,
      annualIpca: latestInflation?.annual_ipca_pct ?? null,
    };
  } catch {
    return {
      items: [],
      totalValue: 0,
      totalInflationPct: 0,
      monthlyIpca: null,
      annualIpca: null,
    };
  }
}
