import { test, expect } from "@playwright/test";
import { RankingPage, EXPECTED_FLAGS } from "./rankingPage";

test.describe("Ranking - Desktop Experience", () => {
  test.setTimeout(30000);
  let ranking: RankingPage;

  test.beforeEach(async ({ page }) => {
    ranking = new RankingPage(page);
    await ranking.goto();
    await ranking.open();
  });

  test("Scenario 1: Ranking loads with exactly 10 country rows", async () => {
    await ranking.expectSectionVisible();

    const itemCount = await ranking.getItemCount();
    expect(itemCount).toBe(10);
  });

  test("Scenario 1b: All 10 countries are present with correct flags", async () => {
    const itemCount = await ranking.getItemCount();
    expect(itemCount).toBe(10);

    const foundFlags: string[] = [];

    for (let i = 0; i < itemCount; i++) {
      const item = ranking.item(i);

      const flag = await ranking.getCountryFlag(item);
      expect(flag?.trim()).toBeTruthy();
      if (flag) foundFlags.push(flag.trim());

      const country = await ranking.getCountry(item);
      expect(country?.trim()).toBeTruthy();
    }

    for (const expectedFlag of EXPECTED_FLAGS) {
      expect(foundFlags).toContain(expectedFlag);
    }
    expect(new Set(foundFlags).size).toBe(10);
  });

  test("Scenario 2: All rows have valid USD, salário and horas values", async () => {
    const itemCount = await ranking.getItemCount();
    expect(itemCount).toBe(10);

    for (let i = 0; i < itemCount; i++) {
      const item = ranking.item(i);

      const usd = await ranking.getUsd(item);
      expect(usd?.trim()).toBeTruthy();
      expect(ranking.parseNumber(usd)).toBeGreaterThan(1);

      const salario = await ranking.getSalario(item);
      expect(salario?.trim()).toBeTruthy();
      expect(ranking.parseNumber(salario)).toBeGreaterThan(1);

      const horas = await ranking.getHoras(item);
      expect(horas?.trim()).toBeTruthy();
      expect(ranking.parseNumber(horas)).toBeGreaterThan(1);
    }
  });

  test("Scenario 3: Footer displays 'Cotação atualizada em' with a valid date", async () => {
    await expect(ranking.footer).toBeVisible({ timeout: 5000 });

    const footerText = await ranking.getFooterText();
    expect(footerText).toBeTruthy();
    expect(footerText).toContain("Cotação atualizada em");

    const hasDate =
      /\d{1,2}\s+de\s+\w+|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(
        footerText ?? "",
      );
    expect(hasDate).toBeTruthy();

    expect(await ranking.getFooterDisplay()).not.toBe("none");
  });
});
