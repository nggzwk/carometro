import { expect } from "@playwright/test";

type Obj = Record<string, unknown>;

function hasProps(obj: Obj, keys: string[]): void {
  for (const key of keys) {
    expect(obj, `missing field "${key}"`).toHaveProperty(key);
  }
}

export const assertShape = {
  basketItem(item: Obj) {
    hasProps(item, [
      "produto_categoria",
      "produto_subcategoria",
      "item_name",
      "qtd_embalagem",
      "month_ref",
      "month_price",
    ]);
    expect(Number(item.month_price)).not.toBeNaN();
  },

  dieeseItem(item: Obj) {
    hasProps(item, [
      "produto_subcategoria",
      "item_name",
      "qtd_basket_dieese",
      "month_ref",
      "qtd_month_price",
    ]);
    expect(Number(item.qtd_month_price)).not.toBeNaN();
  },

  wage(entry: Obj) {
    hasProps(entry, [
      "month_ref",
      "basket_value_brl",
      "minimum_wage_brl",
      "percentage_of_wage",
    ]);
    expect(Number(entry.basket_value_brl)).not.toBeNaN();
  },

  hours(entry: Obj) {
    hasProps(entry, ["month_ref", "working_hours"]);
    expect(Number(entry.working_hours)).not.toBeNaN();
  },

  inflationMonth(entry: Obj) {
    hasProps(entry, [
      "month_ref",
      "actual_month_value_brl",
      "inflation_pct",
      "ipca_monthly_pct",
      "annual_ipca_pct",
    ]);
  },

  annualInflation(entry: Obj) {
    hasProps(entry, [
      "year",
      "start_month_ref",
      "start_month_value_brl",
      "end_month_ref",
      "end_month_value_brl",
      "annual_difference_brl",
      "annual_inflation_pct",
    ]);
    expect(typeof entry.year).toBe("number");
    expect(typeof entry.annual_inflation_pct).toBe("number");
  },

  villains(entry: Obj) {
    hasProps(entry, ["month_ref", "villains"]);
    expect(Array.isArray(entry.villains)).toBeTruthy();
    const list = entry.villains as Obj[];
    if (list.length > 0) hasProps(list[0], ["name", "inflation", "value"]);
  },

  globalBasket(entry: Obj) {
    hasProps(entry, [
      "id",
      "country_region",
      "responsible_authority",
      "local_currency_code",
      "workweek_hours",
    ]);
    expect(typeof entry.id).toBe("number");
    expect(typeof entry.country_region).toBe("string");
  },
};
