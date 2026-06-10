"use server";

import type { BasketSummaryProps } from "./basketTypes";
import { getAvailableMonths, getBasketDataForMonth } from "./basket";
import {
  getVeggieAvailableMonths,
  getVeggieBasketDataForMonth,
} from "./veggieBasket";

export async function fetchBasketMonths(year: number): Promise<string[]> {
  return getAvailableMonths(year);
}

export async function fetchBasketMonth(
  month_ref: string
): Promise<BasketSummaryProps | null> {
  return getBasketDataForMonth(month_ref);
}

export async function fetchVeggieMonths(year: number): Promise<string[]> {
  return getVeggieAvailableMonths(year);
}

export async function fetchVeggieMonth(
  month_ref: string
): Promise<BasketSummaryProps | null> {
  return getVeggieBasketDataForMonth(month_ref);
}
