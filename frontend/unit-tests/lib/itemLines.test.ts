import { describe, it, expect } from "vitest";
import { buildItemLineSeries } from "../../src/lib/itemLines";
import { BASICAO_SUBCATEGORIES } from "../../src/lib/basketIcons";

const ARROZ = 40003;
const FEIJAO = 40012;

describe("buildItemLineSeries", () => {
  it("returns all basicão subcategories with empty points when rows are empty", () => {
    const result = buildItemLineSeries([], 2024);
    expect(result).toHaveLength(BASICAO_SUBCATEGORIES.length);
    for (const item of result) {
      expect(item.points).toHaveLength(0);
    }
  });

  it("calculates cumulative percentage correctly for a single year", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: 20 },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;

    expect(series.points).toHaveLength(1);
    expect(series.points[0].year).toBe("2023");
    expect(series.points[0].value).toBe(25);
    expect(series.points[0].priceBrl).toBe(25);
  });

  it("calculates cumulative percentages across multiple years using the earliest prior December as base", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2021-12", month_price: 10 },
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: 12 },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 15 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;

    expect(series.points).toHaveLength(2);
    expect(series.points[0]).toMatchObject({ year: "2022", value: 20, priceBrl: 12 });
    expect(series.points[1]).toMatchObject({ year: "2023", value: 50, priceBrl: 15 });
  });

  it("returns empty points when the prior December price is missing", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;
    expect(series.points).toHaveLength(0);
  });

  it("returns empty points when the base price is zero (division guard)", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: 0 },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;
    expect(series.points).toHaveLength(0);
  });

  it("returns empty points when the base price is null", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: null },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;
    expect(series.points).toHaveLength(0);
  });

  it("uses the latest available month as anchor for the current year (YTD)", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 20 },
      { produto_subcategoria: ARROZ, month_ref: "2024-06", month_price: 22 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;

    expect(series.points).toHaveLength(1);
    expect(series.points[0].year).toBe("2024");
    expect(series.points[0].value).toBe(10);
    expect(series.points[0].priceBrl).toBe(22);
  });

  it("ignores rows with non-numeric prices", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: "invalid" as unknown as number },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;
    expect(series.points).toHaveLength(0);
  });

  it("parses string prices correctly", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: "20.00" },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: "25.00" },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const series = result.find((s) => s.subcategoria === ARROZ)!;

    expect(series.points).toHaveLength(1);
    expect(series.points[0].value).toBe(25);
  });

  it("keeps different subcategories independent of each other", () => {
    const rows = [
      { produto_subcategoria: ARROZ, month_ref: "2022-12", month_price: 20 },
      { produto_subcategoria: ARROZ, month_ref: "2023-12", month_price: 25 },
      { produto_subcategoria: FEIJAO, month_ref: "2022-12", month_price: 10 },
      { produto_subcategoria: FEIJAO, month_ref: "2023-12", month_price: 14 },
    ];
    const result = buildItemLineSeries(rows, 2024);
    const arroz = result.find((s) => s.subcategoria === ARROZ)!;
    const feijao = result.find((s) => s.subcategoria === FEIJAO)!;

    expect(arroz.points[0].value).toBe(25);
    expect(feijao.points[0].value).toBe(40);
  });

  it("preserves the order of BASICAO_SUBCATEGORIES in the output", () => {
    const result = buildItemLineSeries([], 2024);
    const outputSubcats = result.map((s) => s.subcategoria);
    expect(outputSubcats).toEqual(BASICAO_SUBCATEGORIES);
  });
});
