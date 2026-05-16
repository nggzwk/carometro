import type { BasketSummaryProps } from "./basketTypes";

type BasketItemsApiResponse = {
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
  ipca_monthly_pct: number | null;
  annual_ipca_pct: number | null;
}>;

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

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
      totalValue: 0,
      totalInflationPct: 0,
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
