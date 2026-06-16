import { describe, it, expect, vi } from "vitest";
import {
  itemDisplayName,
  itemFullName,
  menuItemIcon,
  wagePercent,
  shareCaption,
  splitLinesForShare,
  buildGroceryListText,
} from "../../src/components/custom/helpers";
import type { BasketItemData } from "../../src/lib/basketTypes";
import type { CartLine } from "../../src/components/custom/types";

vi.mock("../../src/lib/basketIcons", () => ({
  getBasketItemIcon: (subcat: number) => `basket-${subcat}`,
}));

vi.mock("../../src/lib/veggieBasket", () => ({
  getVeggieItemIcon: (subcat: number) => `veggie-${subcat}`,
}));

vi.mock("../../src/lib/formatters", () => ({
  shortName: (name: string) => name.split(" ")[0].toUpperCase(),
  formatBrl: (value: number) =>
    value === 0
      ? "R$ 0,00"
      : `R$${Math.abs(value).toFixed(2).replace(".", ",")}`,
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

describe("itemFullName", () => {
  it('overrides "abobora" (no accent) to "Abóbora Cabotiá"', () => {
    expect(itemFullName(makeItem("Abobora cabotia"))).toBe("Abóbora Cabotiá");
  });

  it('overrides "coxão mole" to "Coxão Mole s/Osso"', () => {
    expect(itemFullName(makeItem("COXÃO MOLE SEM OSSO"))).toBe(
      "Coxão Mole s/Osso",
    );
  });

  it('overrides "maçã gala" to "Maçã Gala"', () => {
    expect(itemFullName(makeItem("Maçã Gala"))).toBe("Maçã Gala");
  });

  it("falls back to the raw item_name for unrecognised items", () => {
    expect(itemFullName(makeItem("Arroz Polido 5kg"))).toBe("Arroz Polido 5kg");
  });

  it("returns an empty string when item_name is missing", () => {
    expect(itemFullName(makeItem(""))).toBe("");
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

describe("wagePercent", () => {
  it("computes the cart total as a percentage of the monthly minimum wage", () => {
    expect(wagePercent(750, 1500)).toBe(50);
  });

  it("returns 0 when the wage is missing or zero (avoids divide-by-zero)", () => {
    expect(wagePercent(750, 0)).toBe(0);
    expect(wagePercent(750, -1)).toBe(0);
  });

  it("can exceed 100% when the basket costs more than a wage", () => {
    expect(wagePercent(3000, 1500)).toBe(200);
  });
});

describe("splitLinesForShare", () => {
  const makeLines = (n: number): CartLine[] =>
    Array.from({ length: n }, (_, i) => ({
      subcat: i,
      name: `item ${i}`,
      fullName: `item ${i}`,
      sigla: "KG",
      icon: "🍚",
      qty: 1,
      price: 1,
      subtotal: 1,
      insertOrder: i,
    }));

  it("returns a single part for 12 items or fewer", () => {
    const parts = splitLinesForShare(makeLines(12));
    expect(parts).toHaveLength(1);
    expect(parts[0].partLabel).toBeNull();
    expect(parts[0].showTotal).toBe(true);
  });

  it("splits more than 12 items into two parts", () => {
    const parts = splitLinesForShare(makeLines(14));
    expect(parts.map((p) => p.lines.length)).toEqual([7, 7]);
    expect(parts[1].showTotal).toBe(true);
  });

  it("gives the extra item to the first part when the count is odd", () => {
    expect(splitLinesForShare(makeLines(13)).map((p) => p.lines.length)).toEqual([7, 6]);
  });

  it("caps the first part at 10 items", () => {
    expect(splitLinesForShare(makeLines(21)).map((p) => p.lines.length)).toEqual([10, 11]);
  });
});

describe("shareCaption", () => {
  it("builds the social caption with the formatted total", () => {
    expect(shareCaption(750)).toBe(
      "Minha cesta do mês está R$750,00 e a sua? Faz aqui ocarometro.com",
    );
  });
});

describe("buildGroceryListText", () => {
  const lines: CartLine[] = [
    {
      subcat: 1,
      name: "ARROZ",
      fullName: "Arroz Polido 5kg",
      sigla: "KG",
      icon: "🍚",
      qty: 2,
      price: 25,
      subtotal: 50,
      insertOrder: 0,
    },
    {
      subcat: 2,
      name: "FEIJÃO",
      fullName: "Feijão Carioca",
      sigla: "KG",
      icon: "🫘",
      qty: 1,
      price: 8,
      subtotal: 8,
      insertOrder: 1,
    },
  ];

  it("renders a checkbox line per item with icon, qty, full name and sigla", () => {
    expect(buildGroceryListText(lines, 58)).toBe(
      "🛒 Minha lista de compras — fiz no ocarometro.com\n\n" +
        "☐ 🍚 2x Arroz Polido 5kg (KG)\n" +
        "☐ 🫘 1x Feijão Carioca (KG)\n\n" +
        "———\nTotal estimado: R$58,00",
    );
  });

  it("keeps the header and total when the list is empty", () => {
    expect(buildGroceryListText([], 0)).toBe(
      "🛒 Minha lista de compras — fiz no ocarometro.com\n\n\n\n———\nTotal estimado: R$ 0,00",
    );
  });
});
