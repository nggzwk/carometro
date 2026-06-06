import type { VeggieBasketApiResponse } from "./veggieBasket";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export type VillainItemData = {
  produto_subcategoria: number;
  item_name: string;
  mom_pct: number | null;
};

export type MonthlyVillainsData = {
  month_ref: string;
  ipca_monthly_pct: number | null;
  percentage_of_wage: number | null; 
  basket_value_brl: number | null;
  villains: VillainItemData[];
};

type VillainsApiResponse = Array<{
  month_ref: string;
  ipca_monthly_pct: number | null;
  villains: Array<{
    name: string;
    inflation: number | null;
    value: number | string | null;
  }>;
}>;

export type WageApiResponse = Array<{
  month_ref: string;
  basket_value_brl: string;
  minimum_wage_brl: string;
  percentage_of_wage: number | null;
}>;

const ITEM_NAME_TO_SUBCATEGORY: Record<string, number> = {
  "Filé de peito de frango sem osso": 10011,
  "Coxão mole sem osso": 10023,
  "Ovos brancos": 20001,
  "Leite Integral": 30001,
  "Arroz polido": 40003,
  "Feijão carioca": 40012,
  "Farinha de trigo": 40017,
  "Óleo de soja": 60001,
  "Açúcar cristal": 80002,
  "Café": 90001,
};

function normalizeItemName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const NORMALIZED_ITEM_NAME_TO_SUBCATEGORY = Object.fromEntries(
  Object.entries(ITEM_NAME_TO_SUBCATEGORY).map(([name, subcategory]) => [
    normalizeItemName(name),
    subcategory,
  ]),
);

export async function getLatestFeiraoVillains(): Promise<MonthlyVillainsData | null> {
  try {
    const [veggieRes, wageRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/vegetable-basket/items/price`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/basket/wage`, { cache: "no-store" }),
    ]);

    if (!veggieRes.ok) return null;

    const veggiePayload = (await veggieRes.json()) as VeggieBasketApiResponse;
    const wagePayload = wageRes.ok ? ((await wageRes.json()) as WageApiResponse) : [];

    const items = veggiePayload.items;
    if (!items.length) return null;

    const month_ref = items[0].month_ref;

    const topVillains = [...items]
      .filter((item) => (item.mom_pct ?? 0) > 0)
      .sort((a, b) => (b.mom_pct ?? -Infinity) - (a.mom_pct ?? -Infinity))
      .slice(0, 3);

    const totalValue = items.reduce(
      (sum, item) => sum + parseFloat(String(item.month_price ?? "0")),
      0,
    );

    const matchingWage = wagePayload.find((w) => w.month_ref === month_ref);
    const minimumWage = matchingWage ? parseFloat(matchingWage.minimum_wage_brl) : null;

    return {
      month_ref,
      ipca_monthly_pct: items[0].ipca_monthly_pct,
      percentage_of_wage: minimumWage ? (totalValue / minimumWage) * 100 : null,
      basket_value_brl: totalValue,
      villains: topVillains.map((item) => ({
        produto_subcategoria: item.produto_subcategoria,
        item_name: item.item_name,
        mom_pct: item.mom_pct,
      })),
    };
  } catch {
    return null;
  }
}

export async function getLatestVillainsMonth(): Promise<MonthlyVillainsData | null> {
  try {
    const [villainsRes, wageRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/basket/villains`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/basket/wage`, { cache: "no-store" }),
    ]);

    if (!villainsRes.ok || !wageRes.ok) {
      return null;
    }

    const villainsPayload = (await villainsRes.json()) as VillainsApiResponse;
    const wagePayload = (await wageRes.json()) as WageApiResponse;

    const latestMonth = villainsPayload[0];
    if (!latestMonth) {
      return null;
    }

    const matchingWage = wagePayload.find(
      (wage) => wage.month_ref === latestMonth.month_ref
    );

    const topVillains = [...latestMonth.villains]
      .filter((v) => (v.inflation ?? 0) > 0)
      .sort((a, b) => (b.inflation ?? -Infinity) - (a.inflation ?? -Infinity))
      .slice(0, 3);

    return {
      month_ref: latestMonth.month_ref,
      ipca_monthly_pct: latestMonth.ipca_monthly_pct,
      percentage_of_wage: matchingWage ? matchingWage.percentage_of_wage : null,
      basket_value_brl: matchingWage ? parseFloat(matchingWage.basket_value_brl) : null,
      villains: topVillains.map((villain) => ({
        produto_subcategoria:
          NORMALIZED_ITEM_NAME_TO_SUBCATEGORY[
            normalizeItemName(villain.name)
          ] ?? 0,
        item_name: villain.name,
        mom_pct: villain.inflation,
      })),
    };
  } catch {
    return null;
  }
}