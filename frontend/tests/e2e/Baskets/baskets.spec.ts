import { test, expect } from "@playwright/test";
import { BasketsPage, ITEM_EMOJIS } from "./basketsPage";

const VIEWS: Array<{
  viewName: string;
  open: (b: BasketsPage) => Promise<void>;
}> = [
  { viewName: "BASICÃO", open: (b) => b.openBasicao() },
  { viewName: "FEIRÃO", open: (b) => b.openFeirao() },
];

for (const { viewName, open } of VIEWS) {
  test.describe(`Baskets - ${viewName}`, () => {
    test.setTimeout(30000);
    let baskets: BasketsPage;

    test.beforeEach(async ({ page }) => {
      baskets = new BasketsPage(page);
      await baskets.goto();
      await open(baskets);
    });

    test("Scenario 1: Load website and interact with basket cards", async () => {
      await expect(baskets.historicoButton).toBeVisible();

      await expect(baskets.mensalLabel).toBeVisible({ timeout: 5000 });
      await expect(baskets.acumuladoLabel).toBeVisible({ timeout: 5000 });

      expect(await baskets.getCardCount()).toBeGreaterThan(0);

      await baskets.forEachCard(async (card, index) => {
        const subcategoria = await baskets.getCardSubcategory(card);
        const cardEmoji = (await baskets.getCardEmoji(card))?.trim();

        if (subcategoria && ITEM_EMOJIS[subcategoria]) {
          expect(cardEmoji).toBe(ITEM_EMOJIS[subcategoria]);
        }

        await baskets.clickCard(card);
        await expect(card).toBeVisible();
        const cardName = await baskets.getCardName(card);
        expect(cardName?.trim()).toBeTruthy();

        if (index > 0) {
          const previousName = await baskets.getCardName(
            baskets.card(index - 1),
          );
          expect(cardName).not.toEqual(previousName);
        }
      }, 10);
    });

    test("Scenario 2: Tooltip appears on inflation label hover and disappears after 5s", { tag: "@optional" }, async () => {
      await expect(baskets.inflationLabel).toBeVisible({ timeout: 5000 });
      await baskets.hover(baskets.inflationLabel);

      const tooltipText = await baskets.getTooltipText();
      expect(tooltipText).toBeTruthy();
      expect(tooltipText?.length).toBeGreaterThan(0);

      await baskets.expectTooltipHidden();
    });

    test("Scenario 3: Help tooltip requires page reload to reappear", async () => {
      await baskets.clickHelpIcon();

      const text = (await baskets.getHelpIconText())?.toLowerCase() ?? "";
      expect(text).toContain("inflação da cesta");
      expect(text).toContain("mensal");
      expect(text).toMatch(/básica|hortifruti/);

      await baskets.clickHelpIcon();
      expect(await baskets.isHelpIconVisible()).toBeFalsy();

      await baskets.reload();
      await open(baskets);
      await expect(baskets.helpIcon).toBeVisible();
    });

    test("Scenario 4: Histórico allows month selection with updated values", async () => {
      await expect(baskets.inflationLabel).toBeVisible({ timeout: 5000 });
      const initialValue = (await baskets.getInflationValue())?.trim();
      expect(initialValue).toBeTruthy();

      await baskets.openHistorico();
      const monthRefs = await baskets.getMonthRefs();
      expect(monthRefs.length).toBeGreaterThan(0);

      const monthValues: Array<string | undefined> = [];
      let previous = initialValue;
      for (const ref of monthRefs) {
        const value = await baskets.selectMonthAndReadValue(ref, previous);
        monthValues.push(value);
        previous = value;
      }

      for (const value of monthValues) {
        expect(value).toBeTruthy();
        expect(value).not.toEqual(initialValue);
      }

      await baskets.clickHistoricoButton();

      await expect
        .poll(async () => (await baskets.getInflationValue())?.trim(), {
          timeout: 5000,
        })
        .toBe(initialValue);
    });

    test("Scenario 5: Positive percentage shows red border and up arrow", async () => {
      expect(await baskets.getCardCount()).toBeGreaterThan(0);

      await baskets.forEachCard(async (card) => {
        const percentage = await baskets.getCardPercentage(card);
        const arrow = await baskets.getCardArrow(card);

        if (percentage && percentage.includes("+")) {
          const borderColor = await baskets.getCardBorderColor(card);
          expect(arrow).toContain("▲");
          expect(baskets.isRedBorder(borderColor)).toBeTruthy();
        }
      }, 10);
    });

    test("Scenario 6: Negative percentage shows green border and down arrow", async () => {
      expect(await baskets.getCardCount()).toBeGreaterThan(0);

      await baskets.forEachCard(async (card) => {
        const percentage = await baskets.getCardPercentage(card);
        const arrow = await baskets.getCardArrow(card);

        if (percentage && percentage.includes("-")) {
          const borderColor = await baskets.getCardBorderColor(card);
          expect(arrow).toContain("▼");
          expect(baskets.isGreenBorder(borderColor)).toBeTruthy();
        }
      }, 10);
    });

    test("Scenario 7: 0.00% shows green border and equal sign", async () => {
      expect(await baskets.getCardCount()).toBeGreaterThan(0);

      await baskets.forEachCard(async (card) => {
        const percentage = await baskets.getCardPercentage(card);
        const equalSign = await baskets.getCardEqualSign(card);

        if (percentage && percentage.includes("0.00%")) {
          const borderColor = await baskets.getCardBorderColor(card);
          expect(equalSign || percentage).toContain("=");
          expect(baskets.isGreenBorder(borderColor)).toBeTruthy();
        }
      }, 10);
    });
  });
}
