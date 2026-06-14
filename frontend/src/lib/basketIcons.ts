const BASKET_ICONS: Record<number, string> = {
  // Basicao
  40003: "🍚", // Arroz
  40012: "🫘", // Feijao
  60001: "🫙", // Oleo
  40017: "🍞", // Trigo / Farinha
  90001: "☕", // Cafe
  30001: "🥛", // Leite
  80002: "🍬", // Acucar
  20001: "🍳", // Ovos
  10011: "🍗", // Frango
  10023: "🥩", // Carne
  // Feirao (vegetable basket)
  50008: "🍅", // Tomate Comum
  50025: "🍌", // Banana Prata
  50005: "🥔", // Batata Inglesa
  50002: "🧅", // Cebola
  50079: "🥬", // Alface Americana
  50080: "🥬", // Alface (fallback — Crespa/Lisa treated as Americana)
  50007: "🥕", // Cenoura
  50021: "🍊", // Laranja Pera
  50017: "🎃", // Abobora
  50029: "🍎", // Maca Gala
  50028: "🍎", // Maça fuji (fallback to maca)
  50004: "🍠", // Batata Doce
};

export function getBasketItemIcon(subcat: number): string {
  return BASKET_ICONS[subcat] || "🛒";
}

const BASKET_ITEM_NAMES: Record<number, string> = {
  // Basicão
  40003: "Arroz",
  40012: "Feijão",
  60001: "Óleo",
  40017: "Farinha",
  90001: "Café",
  30001: "Leite",
  80002: "Açúcar",
  20001: "Ovos",
  10011: "Frango",
  10023: "Carne",
  // Feirão
  50008: "Tomate",
  50025: "Banana",
  50005: "Inglesa",
  50002: "Cebola",
  50079: "Alface",
  50007: "Cenoura",
  50021: "Laranja",
  50017: "Abóbora",
  50029: "Maçã",
  50004: "Doce",
};

export function getBasketItemName(subcat: number): string {
  return BASKET_ITEM_NAMES[subcat] || "Produto";
}

const BASKET_ITEM_COLORS: Record<number, string> = {
  // Basicão
  40003: "#8f8b61", // Arroz
  40012: "#683b2a", // Feijão
  60001: "#5e8097", // Óleo
  40017: "#D97706", // Farinha
  90001: "#78350F", // Café
  30001: "#866c4d", // Leite
  80002: "#fb11ff", // Açúcar
  20001: "#F59E0B", // Ovos
  10011: "#D97706", // Frango
  10023: "#E11D48", // Carne
  // Feirão (accent colors from the Villains podium)
  50008: "#dc2f26", // Tomate
  50025: "#cea100", // Banana
  50005: "#D97706", // Batata Inglesa
  50002: "#CA8A04", // Cebola
  50079: "#16A34A", // Alface
  50007: "#EA580C", // Cenoura
  50021: "#ff8000", // Laranja
  50017: "#743826", // Abóbora
  50029: "#b4004b", // Maçã
  50004: "#D97706", // Batata Doce
};

export function getBasketItemColor(subcat: number): string {
  return BASKET_ITEM_COLORS[subcat] || "#e0aa59";
}

export const BASICAO_SUBCATEGORIES: number[] = [
  40003, 40012, 60001, 40017, 90001, 30001, 80002, 20001, 10011, 10023,
];

export const FEIRAO_SUBCATEGORIES: number[] = [
  50008, 50025, 50005, 50002, 50079, 50007, 50021, 50017, 50029, 50004,
];

export function getBasketItemSubtitle(subcat: number): string {
  return ICONS_SUBTITLES[subcat] || "toque para voltar";
}

const ICONS_SUBTITLES: Record<number, string> = {
  // Basicao
  40003: "POLIDO",
  40012: "CARIOCA",
  60001: "DE SOJA",
  40017: "DE TRIGO",
  90001: "A VACUO",
  30001: "INTEGRAL",
  80002: "CRISTAL",
  20001: "BRANCOS",
  10011: "FILÉ DE PEITO",
  10023: "COXAO MOLE SEM OSSO",
  // Feirao
  50008: "LONGA VIDA",
  50025: "PRATA",
  50005: "INGLESA",
  50002: "BRANCA",
  50079: "AMERICANA",
  50080: "AMERICANA",
  50007: "COMUM",
  50021: "PÊRA",
  50017: "CABOTIÁ",
  50029: "GALA",
  50004: "DOCE",
};

export const basketTypesIcons = {
  basketIcon: "🛒",
  vegetablesBasketIcon: "🧺",
  cleaningBasketIcon: "🧼",
};

const SIGLA_OVERRIDES: Record<number, string> = {
  20001: "DZ", // Ovos (12 unidades = 1 dúzia)
  60001: "UN", // Óleo de soja
  90001: "UN", // Café
  50079: "UN", // Alface Crespa
  50080: "UN", // Alface Lisa (fallback)
};

export function getQtdEmbalagemSigla(
  qtdEmbalagem: string,
  subcat?: number,
): string {
  if (subcat != null && SIGLA_OVERRIDES[subcat]) {
    return SIGLA_OVERRIDES[subcat];
  }

  const raw = (qtdEmbalagem ?? "")
    .trim()
    .toUpperCase()
    .replace(/UNIDADES?/g, "UN");
  if (!raw) return "";

  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return raw;

  const [, qty, unit] = match;
  const cleanUnit = unit.trim();
  return qty === "1" ? cleanUnit : `${qty}${cleanUnit}`;
}
