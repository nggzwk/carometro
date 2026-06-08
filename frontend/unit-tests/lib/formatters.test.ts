import { describe, it, expect } from "vitest";
import { formatPct, formatBrl, shortName } from "../../src/lib/formatters";

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
