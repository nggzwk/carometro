import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ItemCard } from "../../src/components/dashboard/ItemCard";
import type { BasketItemData } from "../../src/lib/basketTypes";

vi.mock("framer-motion");

vi.mock("../../src/lib/basketIcons", () => ({
  getBasketItemIcon: () => "🍚",
  getBasketItemSubtitle: () => "Subtítulo",
  getQtdEmbalagemSigla: () => "KG",
}));

vi.mock("../../src/lib/formatters", () => ({
  formatBrl: (v: number) => `R$ ${v.toFixed(2)}`,
  formatPct: (v: number) => `${v.toFixed(2)}%`,
  shortName: (name: string) => name.split(" ")[0].toUpperCase(),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: IntersectionObserverCallback) {}
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

function makeItem(overrides: Partial<BasketItemData> = {}): BasketItemData {
  return {
    produto_categoria: 1,
    produto_subcategoria: 40003,
    item_name: "Arroz Polido",
    qtd_embalagem: "1KG",
    month_ref: "2024-01",
    month_price: "25.00",
    previous_price: "24.00",
    mom_pct: 4.17,
    ipca_monthly_pct: 0.5,
    ...overrides,
  };
}

describe("ItemCard", () => {
  it("renders the mom_pct percentage", () => {
    render(<ItemCard item={makeItem()} id="card-test" />);
    expect(document.getElementById("card-test-pct")?.textContent).toContain("4.17%");
  });

  it("renders the price delta in BRL", () => {
    render(<ItemCard item={makeItem()} id="card-test" />);
    expect(document.getElementById("card-test-price")?.textContent).toContain("R$ 1.00");
  });

  it("uses inflation (red) accent color when mom_pct > 0", () => {
    render(<ItemCard item={makeItem({ mom_pct: 3 })} id="card-test" />);
    expect(document.getElementById("card-test-pct")?.style.color).toBe("rgb(230, 57, 70)");
  });

  it("uses deflation (teal) accent color when mom_pct < 0", () => {
    render(<ItemCard item={makeItem({ mom_pct: -2 })} id="card-test" />);
    expect(document.getElementById("card-test-pct")?.style.color).toBe("rgb(42, 157, 143)");
  });

  it("clicking the card flips it to reveal the item name", () => {
    render(<ItemCard item={makeItem()} id="card-test" />);
    fireEvent.click(document.getElementById("card-test")!);
    expect(document.getElementById("card-test-name")?.textContent).toBe("ARROZ");
  });

  it("clicking the card a second time flips it back", () => {
    render(<ItemCard item={makeItem()} id="card-test" />);
    const card = document.getElementById("card-test")!;
    fireEvent.click(card);
    fireEvent.click(card);
    expect(card.getAttribute("aria-pressed")).toBe("false");
  });

  it("starts with aria-pressed=false", () => {
    render(<ItemCard item={makeItem()} id="card-test" />);
    expect(document.getElementById("card-test")?.getAttribute("aria-pressed")).toBe("false");
  });

  it('overrides item_name containing "coxão" to show CARNE', () => {
    render(<ItemCard item={makeItem({ item_name: "Coxão Mole sem osso" })} id="card-coxao" />);
    fireEvent.click(document.getElementById("card-coxao")!);
    expect(document.getElementById("card-coxao-name")?.textContent).toBe("CARNE");
  });
});
