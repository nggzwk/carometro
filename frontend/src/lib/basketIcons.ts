const BASKET_ICONS: Record<number, string> = {
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
};

export function getBasketItemIcon(subcat: number): string {
  return BASKET_ICONS[subcat] || "🛒";
}

export function getBasketItemSubtitle(subcat: number): string {
  return ICONS_SUBTITLES[subcat] || "toque para voltar";
}

const ICONS_SUBTITLES: Record<number, string> = {
  40003: "POLIDO",
  40012: "CARIOCA",
  60001: "DE SOJA",
  40017: "DE TRIGO",
  90001: "A VÁCUO",
  30001: "INTEGRAL",
  80002: "CRISTAL",
  20001: "BRANCOS",
  10011: "INTEIRO",
  10023: "COXÃO MOLE SEM OSSO",
};

export const basketTypesIcons = {
  basketIcon: "🛒",
  vegetablesBasketIcon: "🧺",
  cleaningBasketIcon: "🧼",
};
