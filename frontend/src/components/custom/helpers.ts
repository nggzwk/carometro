import type { BasketItemData } from "../../lib/basketTypes";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { getVeggieItemIcon } from "../../lib/veggieBasket";
import { shortName } from "../../lib/formatters";
import type { Menu } from "./types";

const NAME_OVERRIDES: Array<{ match: string[]; label: string }> = [
  { match: ["coxão"], label: "CARNE" },
  { match: ["filé"], label: "FRANGO" },
  { match: ["abobora", "abóbora"], label: "ABÓBORA" },
  { match: ["maca", "maçã"], label: "MAÇÃ" },
];

export function itemDisplayName(item: BasketItemData): string {
  const name = (item.item_name || "").toLowerCase();
  const override = NAME_OVERRIDES.find(({ match }) =>
    match.some((needle) => name.includes(needle)),
  );
  return override?.label ?? shortName(item.item_name);
}

export function menuItemIcon(menu: Menu, subcat: number): string {
  return menu === "basicao"
    ? getBasketItemIcon(subcat)
    : getVeggieItemIcon(subcat);
}
