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
  10011: "INTEIRO",
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
