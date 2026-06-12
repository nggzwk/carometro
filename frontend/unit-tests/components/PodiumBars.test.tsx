import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import PodiumBars from "../../src/components/graphs/Villains/PodiumBars";

vi.mock("framer-motion");

vi.mock("../../../src/lib/basketIcons", () => ({
  getBasketItemIcon: (subcat: number) => `🛒${subcat}`,
}));

vi.mock("../../../src/lib/veggieBasket", () => ({
  getVeggieItemIcon: (subcat: number) => `🥦${subcat}`,
}));

vi.mock("../../../src/lib/formatters", () => ({
  formatPct: (v: number) => `${v.toFixed(2)}%`,
  shortName: (name: string) => name.split(" ")[0].toUpperCase(),
}));

function makeDisplayItem(rank: number, name: string, pct: number, subcat = 40003) {
  return { item_name: name, mom_pct: pct, produto_subcategoria: subcat };
}

function getRootBars(container: Element) {
  return Array.from(container.querySelectorAll('[id^="villain-bar-"]')).filter((el) =>
    /^villain-bar-\d+$/.test(el.id),
  );
}

describe("PodiumBars", () => {
  it("renders a bar for each display item", () => {
    const items = [
      makeDisplayItem(1, "Arroz Polido", 12),
      makeDisplayItem(2, "Feijão Preto", 8),
      makeDisplayItem(3, "Óleo de soja", 5),
    ];
    const { container } = render(<PodiumBars displayItems={items} />);
    expect(getRootBars(container)).toHaveLength(3);
  });

  it("places the 2nd-ranked item in the center position for a 3-item podium", () => {
    const items = [
      makeDisplayItem(1, "Arroz Polido", 12),
      makeDisplayItem(2, "Feijão Preto", 8),
      makeDisplayItem(3, "Óleo de soja", 5),
    ];
    const { container } = render(<PodiumBars displayItems={items} />);
    expect(getRootBars(container)[1].id).toBe("villain-bar-1");
  });

  it("renders percentage labels for each bar", () => {
    const items = [
      makeDisplayItem(1, "Arroz Polido", 12),
      makeDisplayItem(2, "Feijão Preto", 8),
    ];
    const { container } = render(<PodiumBars displayItems={items} />);
    expect(container.querySelectorAll('[id$="-pct"]').length).toBeGreaterThanOrEqual(2);
  });

  it("overrides coxão name to CARNE in the podium label", () => {
    const { container } = render(
      <PodiumBars displayItems={[makeDisplayItem(1, "Coxão Mole sem osso", 10)]} />,
    );
    expect(container.querySelector("#villain-bar-1-name")?.textContent).toBe("CARNE");
  });

  it("overrides filé name to FRANGO in the podium label", () => {
    const { container } = render(
      <PodiumBars displayItems={[makeDisplayItem(1, "Filé de Frango", 7)]} />,
    );
    expect(container.querySelector("#villain-bar-1-name")?.textContent).toBe("FRANGO");
  });

  it("renders all three bars with correct rank IDs for a full podium", () => {
    const items = [
      makeDisplayItem(1, "Arroz", 15),
      makeDisplayItem(2, "Feijão", 10),
      makeDisplayItem(3, "Óleo", 5),
    ];
    const { container } = render(<PodiumBars displayItems={items} />);
    expect(container.querySelector("#villain-bar-1")).not.toBeNull();
    expect(container.querySelector("#villain-bar-2")).not.toBeNull();
    expect(container.querySelector("#villain-bar-3")).not.toBeNull();
  });
});
