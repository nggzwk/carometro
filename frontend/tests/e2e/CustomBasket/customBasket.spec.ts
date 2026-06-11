import { test, expect } from "@playwright/test";
import { CustomBasketPage } from "./customBasketPage";

test.describe("Custom Basket — Monte sua Cesta", () => {
  let basket: CustomBasketPage;

  test.beforeEach(async ({ page }) => {
    basket = new CustomBasketPage(page);
    await basket.goto();
  });

  test("Scenario 1: Adding 15x every item from both menus triggers the 300-item error", async () => {
    test.setTimeout(180000);

    await basket.ensureBasicao(); 
    await basket.clickAllItemsNTimes(15);

    await basket.switchMenu();
    await basket.ensureFeirao();
    await basket.clickAllItemsNTimes(15);

    await basket.clickItem(0);

    await expect(basket.overLimitToast).toBeVisible({ timeout: 3000 });

    await expect(basket.overLimitToast).not.toBeVisible({ timeout: 8000 });
  });

  test("Scenario 2: Adding 300x the same item fills the basket; 301st click shows error", async () => {
    test.setTimeout(120000);

    await basket.ensureBasicao();

    await basket.clickItemNTimes(0, 300);

    await expect(basket.overLimitToast).not.toBeVisible();

    const countText = await basket.getItemCountText();
    expect(countText).toContain("300");

    await basket.clickItem(0);
    await expect(basket.overLimitToast).toBeVisible({ timeout: 30000 });

    await expect(basket.overLimitToast).not.toBeVisible({ timeout: 8000 });
  });

  test("Scenario 3: Sum of line subtotals matches the displayed total across both menus", async () => {
    test.setTimeout(60000);

    const PICK = 5;

    await basket.ensureBasicao();
    const basicaoCount = await basket.itemCircles.count();
    const basicaoPicks = Math.min(basicaoCount, PICK);
    for (let i = 0; i < basicaoPicks; i++) {
      await basket.clickItem(i);
    }

    await basket.switchMenu();
    await basket.ensureFeirao();
    const feiraoCount = await basket.itemCircles.count();
    const feiraoPicks = Math.min(feiraoCount, PICK);
    for (let i = 0; i < feiraoPicks; i++) {
      await basket.clickItem(i);
    }

    await basket.openTotalCart();

    const lineValues = await basket.getLineSubtotalValues();
    const displayedTotal = await basket.getDisplayedTotal();

    expect(lineValues.length).toBe(basicaoPicks + feiraoPicks);

    for (const value of lineValues) {
      expect(value).toBeGreaterThan(0);
    }

    const computedSum = lineValues.reduce((acc, v) => acc + v, 0);
    expect(Math.abs(computedSum - displayedTotal)).toBeLessThanOrEqual(0.02);
  });
});
