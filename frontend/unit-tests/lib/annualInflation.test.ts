import { describe, it, expect } from "vitest";
import { calculateAnnualMinimumWageIncrease } from "../../src/lib/annualInflation";

const wage = (month_ref: string, minimum_wage_brl: number | string | null) => ({
  month_ref,
  basket_value_brl: 0,
  minimum_wage_brl,
  percentage_of_wage: null,
});

describe("calculateAnnualMinimumWageIncrease", () => {
  it("returns empty object for empty input", () => {
    expect(calculateAnnualMinimumWageIncrease([])).toEqual({});
  });

  it("returns null for the first year (no previous year to compare)", () => {
    const rows = [wage("2022-01", 1212), wage("2022-06", 1212)];
    const result = calculateAnnualMinimumWageIncrease(rows);
    expect(result[2022]).toBeNull();
  });

  it("calculates year-over-year increase correctly", () => {
    const rows = [
      wage("2022-01", 1212),
      wage("2023-01", 1320),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    // (1320 - 1212) / 1212 * 100 = 8.91%
    expect(result[2023]).toBeCloseTo(8.91, 1);
  });

  it("uses the highest wage per year (not first occurrence)", () => {
    // mid-year raise: Jan=1200, May=1320
    const rows = [
      wage("2022-01", 1200),
      wage("2022-05", 1320),
      wage("2023-01", 1412),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    // base year uses 1320, not 1200
    const expected = ((1412 - 1320) / 1320) * 100;
    expect(result[2023]).toBeCloseTo(expected, 1);
  });

  it("returns null for a year when previous year wage is missing", () => {
    // No 2021 data → 2022 should be null
    const rows = [
      wage("2022-01", 1212),
      wage("2023-01", 1320),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    expect(result[2022]).toBeNull();
    expect(result[2023]).not.toBeNull();
  });

  it("skips rows with null wage values", () => {
    const rows = [
      wage("2022-01", null),
      wage("2022-06", 1212),
      wage("2023-01", 1320),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    expect(result[2022]).toBeNull();
    expect(result[2023]).toBeCloseTo(((1320 - 1212) / 1212) * 100, 1);
  });

  it("accepts string wage values", () => {
    const rows = [
      wage("2022-01", "1212.00"),
      wage("2023-01", "1320.00"),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    expect(result[2023]).toBeCloseTo(8.91, 1);
  });

  it("handles multiple years in sequence", () => {
    const rows = [
      wage("2021-01", 1100),
      wage("2022-01", 1212),
      wage("2023-01", 1320),
    ];
    const result = calculateAnnualMinimumWageIncrease(rows);
    expect(result[2021]).toBeNull();
    expect(result[2022]).toBeCloseTo(((1212 - 1100) / 1100) * 100, 1);
    expect(result[2023]).toBeCloseTo(((1320 - 1212) / 1212) * 100, 1);
  });
});
