import { describe, it, expect, vi } from "vitest";
import { itemDisplayName, menuItemIcon } from "../../src/components/custom/helpers";
import type { BasketItemData } from "../../src/lib/basketTypes";

vi.mock("../../src/lib/basketIcons", () => ({
  getBasketItemIcon: (subcat: number) => `basket-${subcat}`,
}));

vi.mock("../../src/lib/veggieBasket", () => ({
  getVeggieItemIcon: (subcat: number) => `veggie-${subcat}`,
}));

vi.mock("../../src/lib/formatters", () => ({
  shortName: (name: string) => name.split(" ")[0].toUpperCase(),
}));

function makeItem(item_name: string): BasketItemData {
  return {
    produto_categoria: 1,
    produto_subcategoria: 10011,
    item_name,
    qtd_embalagem: "1KG",
    month_ref: "2024-01",
    month_price: "25.00",
    previous_price: "24.00",
    mom_pct: 4.17,
    ipca_monthly_pct: 0.5,
  };
}

describe("itemDisplayName", () => {
  it('overrides "coxão" to CARNE', () => {
    expect(itemDisplayName(makeItem("Coxão Mole sem osso"))).toBe("CARNE");
  });

  it('overrides "filé" to FRANGO', () => {
    expect(itemDisplayName(makeItem("Filé de peito de frango"))).toBe("FRANGO");
  });

  it('overrides "abóbora" to ABÓBORA', () => {
    expect(itemDisplayName(makeItem("Abóbora cabotiá"))).toBe("ABÓBORA");
  });

  it('overrides "abobora" (no accent) to ABÓBORA', () => {
    expect(itemDisplayName(makeItem("Abobora cabotia"))).toBe("ABÓBORA");
  });

  it('overrides "maçã" to MAÇÃ', () => {
    expect(itemDisplayName(makeItem("Maçã Gala"))).toBe("MAÇÃ");
  });

  it('overrides "maca" (no accent) to MAÇÃ', () => {
    expect(itemDisplayName(makeItem("Maca Fuji"))).toBe("MAÇÃ");
  });

  it("falls back to shortName for unrecognised items", () => {
    expect(itemDisplayName(makeItem("Arroz Polido 5kg"))).toBe("ARROZ");
  });

  it("is case-insensitive for the override match", () => {
    expect(itemDisplayName(makeItem("COXÃO MOLE"))).toBe("CARNE");
  });
});

describe("menuItemIcon", () => {
  it("returns the basicao icon for menu=basicao", () => {
    expect(menuItemIcon("basicao", 40003)).toBe("basket-40003");
  });

  it("returns the veggie icon for menu=feirao", () => {
    expect(menuItemIcon("feirao", 50008)).toBe("veggie-50008");
  });
});
