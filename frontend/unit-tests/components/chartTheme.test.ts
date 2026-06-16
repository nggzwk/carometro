import { describe, it, expect } from "vitest";
import {
  SERIES_COLORS,
  CHART_MARGIN,
  pctTickFormatter,
} from "../../src/components/graphs/shared/chartTheme";

describe("chartTheme (shared)", () => {
  it("exposes a color for each data series", () => {
    expect(SERIES_COLORS.dieese).toBeTruthy();
    expect(SERIES_COLORS.wageIncrease).toBeTruthy();
    expect(SERIES_COLORS.ipca).toBeTruthy();
  });

  it("provides chart margins", () => {
    expect(CHART_MARGIN).toMatchObject({
      top: expect.any(Number),
      right: expect.any(Number),
      left: expect.any(Number),
      bottom: expect.any(Number),
    });
  });

  it("formats axis ticks as percentages", () => {
    expect(pctTickFormatter(20)).toBe("20%");
  });
});
