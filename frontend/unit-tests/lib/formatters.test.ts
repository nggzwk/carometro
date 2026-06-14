import { describe, it, expect } from "vitest";
import {
  formatPct,
  formatBrl,
  shortName,
  formatSignedPct,
  formatBrlFromBase,
  formatBrlValue,
} from "../../src/lib/formatters";

describe("formatPct", () => {
  it("returns '0%' for null", () => {
    expect(formatPct(null)).toBe("0%");
  });

  it("returns '0%' for NaN", () => {
    expect(formatPct(NaN)).toBe("0%");
  });

  it("adds '+' sign for positive values by default", () => {
    expect(formatPct(2.5)).toBe("+2.50%");
  });

  it("does not add sign for zero", () => {
    expect(formatPct(0)).toBe("0.00%");
  });

  it("preserves '-' sign for negative values", () => {
    expect(formatPct(-1.5)).toBe("-1.50%");
  });

  it("omits '+' sign when withSign is false", () => {
    expect(formatPct(3.14, false)).toBe("3.14%");
  });

  it("rounds to two decimal places", () => {
    expect(formatPct(1.23456)).toBe("+1.23%");
  });
});

describe("formatBrl", () => {
  it("returns 'R$ 0,00' for zero", () => {
    expect(formatBrl(0)).toBe("R$ 0,00");
  });

  it("formats positive value with comma decimal separator", () => {
    expect(formatBrl(12.5)).toBe("R$12,50");
  });

  it("formats negative value as absolute (strips sign)", () => {
    expect(formatBrl(-8.99)).toBe("R$8,99");
  });

  it("rounds to two decimal places", () => {
    expect(formatBrl(1.005)).toBe("R$1,00");
  });

  it("formats large value", () => {
    expect(formatBrl(1234.56)).toBe("R$1234,56");
  });
});

describe("formatSignedPct", () => {
  it("returns '-' for null", () => {
    expect(formatSignedPct(null)).toBe("-");
  });

  it("returns '-' for NaN", () => {
    expect(formatSignedPct(NaN)).toBe("-");
  });

  it("adds '+' sign for positive values", () => {
    expect(formatSignedPct(12.5)).toBe("+12.50%");
  });

  it("keeps '-' sign for negative values", () => {
    expect(formatSignedPct(-3.2)).toBe("-3.20%");
  });

  it("renders zero without a sign", () => {
    expect(formatSignedPct(0)).toBe("0.00%");
  });
});

describe("formatBrlFromBase", () => {
  it("returns null when the value is null", () => {
    expect(formatBrlFromBase(null, 200)).toBeNull();
  });

  it("returns null when the base is zero", () => {
    expect(formatBrlFromBase(10, 0)).toBeNull();
  });

  it("applies the cumulative percentage to the base value", () => {
    const result = formatBrlFromBase(10, 200);
    // 200 * (1 + 10/100) = 220
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/220/);
  });

  it("supports negative percentages", () => {
    const result = formatBrlFromBase(-50, 200);
    expect(result).toMatch(/100/);
  });
});

describe("formatBrlValue", () => {
  it("returns null for null", () => {
    expect(formatBrlValue(null)).toBeNull();
  });

  it("formats an absolute value as BRL currency", () => {
    const result = formatBrlValue(25);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/25/);
  });
});

describe("shortName", () => {
  it("returns the first word in uppercase", () => {
    expect(shortName("Arroz polido")).toBe("ARROZ");
  });

  it("handles single-word names", () => {
    expect(shortName("Café")).toBe("CAFÉ");
  });

  it("handles names with many words", () => {
    expect(shortName("Filé de peito de frango")).toBe("FILÉ");
  });

  it("returns empty string for empty input", () => {
    expect(shortName("")).toBe("");
  });

  it("uppercases already-uppercase input", () => {
    expect(shortName("FEIJÃO carioca")).toBe("FEIJÃO");
  });
});
