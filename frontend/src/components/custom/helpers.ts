import type { BasketItemData } from "../../lib/basketTypes";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { getVeggieItemIcon } from "../../lib/veggieBasket";
import { formatBrl, shortName } from "../../lib/formatters";
import type { CartLine, Menu } from "./types";

const NAME_OVERRIDES: Array<{ match: string[]; label: string }> = [
  { match: ["coxão"], label: "CARNE" },
  { match: ["filé"], label: "FRANGO" },
  { match: ["abobora", "abóbora"], label: "ABÓBORA" },
  { match: ["maca", "maçã"], label: "MAÇÃ" },
];

const FULL_NAME_OVERRIDES: Array<{ match: string[]; label: string }> = [
  { match: ["maca gala", "maçã gala"], label: "Maçã Gala" },
  { match: ["abobora", "abóbora"], label: "Abóbora Cabotiá" },
  { match: ["coxão mole"], label: "Coxão Mole s/Osso" },
  { match: ["filé de peito de frango"], label: "Filé de Peito" },
  { match: ["laranja pera"], label: "Laranja Pêra" },
];

export function itemDisplayName(item: BasketItemData): string {
  const name = (item.item_name || "").toLowerCase();
  const override = NAME_OVERRIDES.find(({ match }) =>
    match.some((needle) => name.includes(needle)),
  );
  return override?.label ?? shortName(item.item_name);
}

export function itemFullName(item: BasketItemData): string {
  const name = (item.item_name || "").toLowerCase();
  const override = FULL_NAME_OVERRIDES.find(({ match }) =>
    match.some((needle) => name.includes(needle)),
  );
  return override?.label ?? item.item_name ?? "";
}

export function menuItemIcon(menu: Menu, subcat: number): string {
  return menu === "basicao"
    ? getBasketItemIcon(subcat)
    : getVeggieItemIcon(subcat);
}

export function wagePercent(total: number, minimumWage: number): number {
  if (!minimumWage || minimumWage <= 0) return 0;
  return (total / minimumWage) * 100;
}

export function shareCaption(total: number): string {
  return `Minha cesta do mês está ${formatBrl(
    total,
  )} e a sua? Faz aqui ocarometro.com`;
}

export interface SharePart {
  lines: CartLine[];
  partLabel: string | null;
  showTotal: boolean;
}

export function splitLinesForShare(lines: CartLine[]): SharePart[] {
  const n = lines.length;
  if (n <= 12) {
    return [{ lines, partLabel: null, showTotal: true }];
  }
  const firstCount = Math.min(Math.ceil(n / 2), 10);
  return [
    {
      lines: lines.slice(0, firstCount),
      partLabel: "Parte 1 de 2",
      showTotal: false,
    },
    {
      lines: lines.slice(firstCount),
      partLabel: "Parte 2 de 2",
      showTotal: true,
    },
  ];
}

export function buildGroceryListText(lines: CartLine[], total: number): string {
  const items = lines
    .map((l) => `☐ ${l.icon} ${l.qty}x ${l.fullName} (${l.sigla})`)
    .join("\n");
  return `🛒 Minha lista de compras — fiz no ocarometro.com\n\n${items}\n\n———\nTotal estimado: ${formatBrl(
    total,
  )}`;
}
