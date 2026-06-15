import { test, expect } from "@playwright/test";
import { AxisPage } from "./axisPage";

function toNumber(text: string | null | undefined): number {
  const m = (text ?? "").match(/-?\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(",", ".")) : NaN;
}

test.describe("Axis Graph - Desktop Experience", () => {
  test.setTimeout(30000);

  let axis: AxisPage;

  test.beforeEach(async ({ page }) => {
    axis = new AxisPage(page);
    await axis.goto();
    await axis.ready();
  });

  test("Scenario 1: Graph loads with proper axis, subtitle and years", async () => {
    const years = (await axis.getXAxisYears()).map(Number);
    const currentYear = new Date().getFullYear();
    expect(years).toContain(2023);
    expect(years).toContain(currentYear);
    expect(Math.min(...years)).toBe(2023);
    expect(Math.max(...years)).toBe(currentYear);

    await expect(axis.subtitleItems.first()).toBeVisible({ timeout: 3000 });
    expect(await axis.subtitleItems.count()).toBeGreaterThan(0);

    const yLabels = await axis.getYAxisLabels();
    expect(yLabels.length).toBeGreaterThan(0);
    expect(yLabels.some((l) => l.includes("%"))).toBeTruthy();
  });

  test("Scenario 2, 4, 5, 6, 8: Tooltip interactions for every year", async () => {
    const years = await axis.getDotYears();
    expect(years.length).toBeGreaterThan(0);
    const currentYear = String(new Date().getFullYear());

    for (const year of years) {
      // Scenario 2: hovering a dot opens a tooltip with its squares.
      await axis.hoverDot(year);
      const squareCount = await axis.getSquareCount();
      expect(squareCount).toBeGreaterThanOrEqual(2);

      // Scenario 4: the yellow (inflation) square shows a BRL value.
      expect(await axis.hasBrl("inflation")).toBeTruthy();
      expect(await axis.getMetricBrl("inflation")).toMatch(/R\$|\d/);

      // Scenario 5: the blue (wageIncrease) square shows a BRL value.
      expect(await axis.hasBrl("wageIncrease")).toBeTruthy();
      expect(await axis.getMetricBrl("wageIncrease")).toMatch(/R\$|\d/);

      // Scenario 6: the pink (ipca) square shows no extra BRL info.
      expect(await axis.hasBrl("ipca")).toBeFalsy();

      if (year !== currentYear) {
        expect(await axis.hasMetricData("ipca")).toBeTruthy();
      }

      // Scenario 8: the tooltip is hover-driven — moving the mouse away hides it.
      await axis.page.mouse.click(0, 0);
      await expect(axis.tooltip).toBeHidden({ timeout: 2000 });
    }
  });

  test("Scenario 7: Current-year yellow percentage matches the top Y value", async () => {
    const years = await axis.getDotYears();
    const lastYear = years[years.length - 1];

    await axis.hoverDot(lastYear);

    const inflationPct = toNumber(await axis.getMetricValue("inflation"));
    expect(Number.isNaN(inflationPct)).toBeFalsy();

    const yValues = (await axis.getYAxisLabels()).map(toNumber).filter((n) => !Number.isNaN(n));
    const maxY = Math.max(...yValues);
    expect(Math.abs(inflationPct - maxY)).toBeLessThanOrEqual(maxY);
  });

  test("Scenario 1b: Data points match the X-axis years", async () => {
    const dotYears = await axis.getDotYears();
    const xYears = await axis.getXAxisYears();

    expect(dotYears.length).toBeGreaterThan(0);
    expect(dotYears.sort()).toEqual([...xYears].sort());
  });
});
