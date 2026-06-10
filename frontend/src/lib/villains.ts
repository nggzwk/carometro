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
  }>;
}>;

export type WageApiResponse = Array<{
  month_ref: string;
  basket_value_brl: string;
  minimum_wage_brl: string;
  percentage_of_wage: number | null;
}>;

function normalizeItemName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeKeys(map: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map).map(([name, subcategory]) => [
      normalizeItemName(name),
      subcategory,
    ]),
  );
}

const BASICAO_NAME_TO_SUBCATEGORY = normalizeKeys({
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
});

const VEGGIE_NAME_TO_SUBCATEGORY = normalizeKeys({
  "Tomate Comum": 50008,
  "Banana Prata": 50025,
  "Batata Inglesa": 50005,
  Cebola: 50002,
  "Alface Crespa": 50079,
  Cenoura: 50007,
  "Laranja Pera": 50021,
  Abobora: 50017,
  "Maca Gala": 50029,
  "Batata Doce": 50004,
  "Tomate Rasteiro": 50009,
  "Banana Caturra": 50024,
  "Alface Lisa": 50080,
  "Maca Fuji": 50028,
});

async function getLatestVillains(
  villainsUrl: string,
  wageUrl: string,
  nameToSubcategory: Record<string, number>,
): Promise<MonthlyVillainsData | null> {
  try {
    const [villainsRes, wageRes] = await Promise.all([
      fetch(villainsUrl, { cache: "no-store" }),
      fetch(wageUrl, { cache: "no-store" }),
    ]);

    if (!villainsRes.ok) return null;

    const villainsPayload = (await villainsRes.json()) as VillainsApiResponse;
    const wagePayload = wageRes.ok ? ((await wageRes.json()) as WageApiResponse) : [];

    const latestMonth = villainsPayload[0];
    if (!latestMonth) return null;

    const matchingWage = wagePayload.find((w) => w.month_ref === latestMonth.month_ref);

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
        produto_subcategoria: nameToSubcategory[normalizeItemName(villain.name)] ?? 0,
        item_name: villain.name,
        mom_pct: villain.inflation,
      })),
    };
  } catch {
    return null;
  }
}

export function getLatestFeiraoVillains(): Promise<MonthlyVillainsData | null> {
  return getLatestVillains(
    `${API_BASE_URL}/api/vegetable-basket/villains`,
    `${API_BASE_URL}/api/vegetable-basket/wage`,
    VEGGIE_NAME_TO_SUBCATEGORY,
  );
}

export function getLatestVillainsMonth(): Promise<MonthlyVillainsData | null> {
  return getLatestVillains(
    `${API_BASE_URL}/api/basket/villains`,
    `${API_BASE_URL}/api/basket/wage`,
    BASICAO_NAME_TO_SUBCATEGORY,
  );
}
