import { test, expect } from "@playwright/test";
import { VillainsPage } from "./villainsPage";

const VIEWS: Array<{
  viewName: string;
  open: (b: VillainsPage) => Promise<void>;
}> = [
  { viewName: "BASICÃO", open: (b) => b.openBasicao() },
  { viewName: "FEIRÃO", open: (b) => b.openFeirao() },
];

for (const { viewName, open } of VIEWS) {
  test.describe(`Vilões do Mês - ${viewName}`, () => {
    test.setTimeout(30000);
    let villains: VillainsPage;

    test.beforeEach(async ({ page }) => {
      villains = new VillainsPage(page);
      await villains.goto();
      await open(villains);
    });

    test("Scenario 1: Vilões bars are the basket's top positive items, icons matching", async () => {
      const villainItems = await villains.getVillainItems(3);

      await villains.scrollToSection();

      const barCount = await villains.getBarCount();
      expect(barCount).toBe(villainItems.length);

      if (villainItems.length === 0) {
        return;
      }

      await villains.expectSectionVisible();

      for (let rank = 1; rank <= barCount; rank++) {
        const item = villainItems[rank - 1];

        const barEmoji = await villains.getBarEmoji(rank);
        const barPct = (await villains.getBarPct(rank))?.trim();

        expect(barEmoji).toBe(item.emoji);
        expect(barPct).toBe(item.pct);

        const expected = villains.expectedEmoji(item.subcategoria);
        if (expected) expect(barEmoji).toBe(expected);
      }
    });

    test("Scenario 2: Each villain bar shows its percentage tooltip on hover", async () => {
      const villainItems = await villains.getVillainItems(3);
      test.skip(villainItems.length === 0, "No villains this month");

      await villains.scrollToSection();
      await villains.expectSectionVisible();

      for (let rank = 1; rank <= villainItems.length; rank++) {
        await villains.hoverBarByRank(rank);
        expect(await villains.isBarTooltipVisible(rank)).toBeTruthy();
        expect((await villains.getBarTooltipPct(rank))?.trim()).toMatch(/%/);
      }
    });

    test("Scenario 3: Bar tooltip percentage matches the basket card percentage", async () => {
      const villainItems = await villains.getVillainItems(3);
      test.skip(villainItems.length === 0, "No villains this month");
      const basketPercentages = villainItems.map((item) => item.pct);

      await villains.scrollToSection();
      await villains.expectSectionVisible();

      for (let rank = 1; rank <= basketPercentages.length; rank++) {
        await villains.hoverBarByRank(rank);
        const tooltipPct = (await villains.getBarTooltipPct(rank))?.trim();
        expect(tooltipPct).toBe(basketPercentages[rank - 1]);
      }
    });
  });
}
