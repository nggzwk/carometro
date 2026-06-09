import { Page, Locator, expect } from "@playwright/test";

export const COUNTRY_FLAGS: Record<string, string> = {
  Brazil: "🇧🇷",
  Germany: "🇩🇪",
  USA: "🇺🇸",
  Argentina: "🇦🇷",
  Chile: "🇨🇱",
  India: "🇮🇳",
  Portugal: "🇵🇹",
  Russia: "🇷🇺",
  Paraguay: "🇵🇾",
  China: "🇨🇳",
};

export const EXPECTED_FLAGS = Object.values(COUNTRY_FLAGS);

export class RankingPage {
  readonly page: Page;

  readonly section: Locator;

  readonly items: Locator;

  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;

    this.section = page.locator('h2:has-text("Ranking")').first();

    this.items = page.locator('article[id^="ranking-row-"]');

    this.footer = page
      .locator('span:has-text("Cotação atualizada em")')
      .first();
  }

  // ---------- Navigation ----------

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async open() {
    await expect(this.section).toBeVisible({ timeout: 5000 });
    await this.section.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async expectSectionVisible() {
    await expect(this.section).toBeVisible({ timeout: 5000 });
  }

  // ---------- Items / rows ----------

  item(index: number): Locator {
    return this.items.nth(index);
  }

  itemByRank(rank: number): Locator {
    return this.page.locator(`article#ranking-row-${rank}`);
  }

  async getItemCount(): Promise<number> {
    return this.items.count();
  }

  // ---------- Cell value getters (relative to a row article) ----------

  async getCountry(item: Locator): Promise<string | null> {
    return item.locator("span.truncate").first().textContent();
  }

  async getCountryFlag(item: Locator): Promise<string | null> {
    return item.locator("span.mr-1.text-xl").first().textContent();
  }

  async getUsd(item: Locator): Promise<string | null> {
    return item.locator('[id$="-usd"]').first().textContent();
  }

  async getSalario(item: Locator): Promise<string | null> {
    return item.locator('[id$="-wage-pct"]').first().textContent();
  }

  async getHoras(item: Locator): Promise<string | null> {
    return item.locator('[id$="-hours"]').first().textContent();
  }

  // ---------- Footer ----------

  async getFooterText(): Promise<string | null> {
    return this.footer.textContent();
  }

  async getFooterDisplay(): Promise<string> {
    return this.footer.evaluate((el) => window.getComputedStyle(el).display);
  }

  // ---------- Parsing helpers (pure) ----------

  parseNumber(text: string | null | undefined): number {
    return parseFloat(
      (text ?? "").replace(/[^\d.,]/g, "").replace(",", ".") || "0",
    );
  }
}
