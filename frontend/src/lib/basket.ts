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
  }>;
};

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function getBasketSummaryProps(): Promise<BasketSummaryProps> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/basket/items/price`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        items: [],
        totalValue: 0,
        totalInflationPct: 0,
        monthlyIpca: null,
        annualIpca: null,
      };
    }

    const data = (await response.json()) as BasketItemsApiResponse;

    return {
      items: data.items.map((item) => ({
        ...item,
        month_price: item.month_price === null ? "0" : String(item.month_price),
        previous_price:
          item.previous_price === null ? null : String(item.previous_price),
      })),
      totalValue: 0,
      totalInflationPct: 0,
      monthlyIpca: null,
      annualIpca: null,
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
