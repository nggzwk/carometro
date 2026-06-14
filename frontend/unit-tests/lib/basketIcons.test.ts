import { describe, it, expect } from "vitest";
import {
  getBasketItemName,
  getBasketItemColor,
  getBasketItemIcon,
  FEIRAO_SUBCATEGORIES,
  BASICAO_SUBCATEGORIES,
} from "../../src/lib/basketIcons";

const TOMATE = 50008;
const BATATA_INGLESA = 50005;
const BATATA_DOCE = 50004;

describe("basketIcons - feirão items", () => {
  it("exposes ten feirão subcategories distinct from basicão", () => {
    expect(FEIRAO_SUBCATEGORIES).toHaveLength(10);
    const overlap = FEIRAO_SUBCATEGORIES.filter((s) =>
      BASICAO_SUBCATEGORIES.includes(s),
    );
    expect(overlap).toHaveLength(0);
  });

  it("labels batata inglesa as 'Inglesa' and batata doce as 'Doce'", () => {
    expect(getBasketItemName(BATATA_INGLESA)).toBe("Inglesa");
    expect(getBasketItemName(BATATA_DOCE)).toBe("Doce");
  });

  it("provides names for every feirão subcategory", () => {
    for (const subcat of FEIRAO_SUBCATEGORIES) {
      expect(getBasketItemName(subcat)).not.toBe("Produto");
    }
  });

  it("provides a non-default color for every feirão subcategory", () => {
    for (const subcat of FEIRAO_SUBCATEGORIES) {
      expect(getBasketItemColor(subcat)).not.toBe("#e0aa59");
    }
  });

  it("provides an icon for every feirão subcategory", () => {
    for (const subcat of FEIRAO_SUBCATEGORIES) {
      expect(getBasketItemIcon(subcat)).not.toBe("🛒");
    }
  });

  it("uses the villain accent color for tomate", () => {
    expect(getBasketItemColor(TOMATE)).toBe("#dc2f26");
  });

  it("falls back to defaults for unknown subcategories", () => {
    expect(getBasketItemName(999999)).toBe("Produto");
    expect(getBasketItemColor(999999)).toBe("#e0aa59");
    expect(getBasketItemIcon(999999)).toBe("🛒");
  });
});
