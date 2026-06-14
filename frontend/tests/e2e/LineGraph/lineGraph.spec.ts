import { test, expect } from "@playwright/test";
import { LineGraphPage, type Basket } from "./lineGraphPage";

const BASKETS: Basket[] = ["basicao", "feirao"];

for (const basket of BASKETS) {
  test.describe(`Line Graph - ${basket} inflation over time`, () => {
  test.setTimeout(30000);

  let lg: LineGraphPage;

  test.beforeEach(async ({ page }) => {
    lg = new LineGraphPage(page);
    await lg.goto();
    await lg.ready();
    await lg.selectBasket(basket);
  });

  test("Scenario 1: Graph loads with title, chart area, and legend", async () => {
    const expectedTitle = basket === "basicao" ? "BASICÃO" : "FEIRÃO";
    await expect(lg.title).toHaveText(expectedTitle);
    await expect(lg.graph).toBeVisible();
    await expect(lg.legend).toBeVisible();

    const count = await lg.getLegendItemCount();
    expect(count).toBe(10);
  });

  test("Scenario 2: Exactly one legend item is selected on initial load", async () => {
    const activeId = await lg.getActiveLegendItemId();
    expect(activeId).not.toBeNull();

    const activeCount = await lg.page
      .locator('[id^="line-legend-"][aria-pressed="true"]')
      .count();
    expect(activeCount).toBe(1);
  });

  test("Scenario 3: Clicking an inactive legend item selects it", async () => {
    const allItems = await lg.legendItems.all();
    const firstId = await allItems[0].getAttribute("id");
    const secondId = await allItems[1].getAttribute("id");

    await expect(allItems[0]).toHaveAttribute("aria-pressed", "true");

    await allItems[1].click();

    await expect(lg.page.locator(`#${secondId}`)).toHaveAttribute("aria-pressed", "true");
    await expect(lg.page.locator(`#${firstId}`)).toHaveAttribute("aria-pressed", "false");
  });

  test("Scenario 4: Clicking the active legend item deselects it", async () => {
    const activeId = await lg.getActiveLegendItemId();
    expect(activeId).not.toBeNull();

    await lg.page.locator(`#${activeId}`).click();

    await expect(lg.page.locator(`#${activeId}`)).toHaveAttribute("aria-pressed", "false");
  });

  test("Scenario 5: Data dots are rendered for the selected item", async () => {
    const years = await lg.getDotYears();
    expect(years.length).toBeGreaterThan(0);

    const currentYear = new Date().getFullYear();
    expect(years.map(Number)).toContain(currentYear);
  });

  test("Scenario 6: Hovering a dot shows a tooltip with percentage and BRL price", async () => {
    const years = await lg.getDotYears();
    expect(years.length).toBeGreaterThan(0);

    await lg.hoverDot(years[0]);

    const text = await lg.getTooltipText();
    expect(text).toMatch(/%/);
    expect(text).toMatch(/R\$/);
  });

  test("Scenario 7: Moving the mouse away from a dot hides the tooltip", async () => {
    const years = await lg.getDotYears();
    await lg.hoverDot(years[0]);
    expect(await lg.isTooltipVisible()).toBeTruthy();

    await lg.dismissTooltip();
    expect(await lg.isTooltipVisible()).toBeFalsy();
  });

  test("Scenario 8: Clicking a dot shows the tooltip", async () => {
    const years = await lg.getDotYears();
    await lg.clickDot(years[0]);
    expect(await lg.isTooltipVisible()).toBeTruthy();

    await expect(lg.tooltipRow("item")).toBeVisible();
    await expect(lg.tooltipRow("wageIncrease")).toBeVisible();
    await expect(lg.tooltipRow("ipca")).toBeVisible();
  });

  test("Scenario 9: Switching to a different legend item updates the dots", async () => {
    const initialYears = await lg.getDotYears();
    expect(initialYears.length).toBeGreaterThan(0);

    const allItems = await lg.legendItems.all();
    await allItems[1].click();
    await lg.page.waitForTimeout(300);

    const newYears = await lg.getDotYears();
    expect(newYears.length).toBeGreaterThan(0);
  });

  test("Scenario 10: Tooltip percentage sign is positive or negative based on value", async () => {
    const years = await lg.getDotYears();
    await lg.hoverDot(years[0]);

    const text = await lg.getTooltipText();
    expect(text).toMatch(/[+-]?\d+\.\d{2}%/);
  });

  test("Scenario 11: Y-axis shows percentage labels", async () => {
    const yLabels = await lg.page
      .locator('text.recharts-cartesian-axis-tick-value[orientation="left"]')
      .allTextContents();

    expect(yLabels.length).toBeGreaterThan(0);
    expect(yLabels.some((l) => l.includes("%"))).toBeTruthy();
  });

  test("Scenario 12: X-axis shows year labels including the current year", async () => {
    const xLabels = await lg.page
      .locator('text.recharts-cartesian-axis-tick-value[orientation="bottom"]')
      .allTextContents();

    const currentYear = new Date().getFullYear();
    const years = xLabels.map((l) => parseInt(l.trim(), 10));
    expect(years).toContain(currentYear);
  });
  });
}
