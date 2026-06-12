import type { BasketItemData } from "../../lib/basketTypes";

export type Menu = "basicao" | "feirao";

export interface CartLine {
  subcat: number;
  name: string;
  fullName: string;
  sigla: string;
  icon: string;
  qty: number;
  price: number;
  subtotal: number;
  insertOrder: number;
}

export interface CartEntry {
  item: BasketItemData;
  icon: string;
  qty: number;
  insertOrder: number;
}
