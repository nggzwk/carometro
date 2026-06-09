import { Page, Locator, expect } from "@playwright/test";
import { ITEM_EMOJIS } from "../Baskets/basketsPage";

/** A basket grid item (read from #item-grid). */
export interface BasketItem {
  subcategoria: string | null;
  emoji: string;
  pct: string; // formatted, e.g. "+5.20%"
  value: number; // signed numeric percentage
}

export class VillainsPage {
  readonly page: Page;

  readonly basicaoButton: Locator;
  readonly feiraoButton: Locator;
  readonly section: Locator;

  // Basket grid (top of the dashboard).
  readonly basketCards: Locator;

  // Podium bars (Vilões do Mês). Containers carry the `group` class.
  readonly barItems: Locator;

  // Villain summary cards (basket value / salary %).
  readonly salarioCard: Locator;
  readonly priceCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.basicaoButton = page
      .locator('button:has-text("Basicão"), button:has-text("BASICÃO")')
      .first();
    this.feiraoButton = page
      .locator('button:has-text("Feirão"), button:has-text("FEIRÃO")')
      .first();
    this.section = page.locator('h2:has-text("Vilões do Mês")').first();

    this.basketCards = page.locator("#item-grid > div");
    this.barItems = page.locator('div[id^="villain-bar-"].group');

    this.salarioCard = page.locator("#villain-card-salary-pct").first();
    this.priceCard = page.locator("#villain-card-basket-value").first();
  }

  // ---------- Navigation ----------
  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async openBasicao() {
    if (await this.feiraoButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.page.waitForLoadState("networkidle");
    }
  }

  async openFeirao() {
    await expect(this.feiraoButton).toBeVisible({ timeout: 5000 });
    await this.feiraoButton.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState("networkidle");
  }

  async scrollToSection() {
    await this.section.scrollIntoViewIfNeeded();
  }

  async expectSectionVisible() {
    await expect(this.section).toBeVisible({ timeout: 5000 });
  }

  // ---------- Basket grid (top items) ----------

  /** Parse a signed percentage string ("+5.20%" -> 5.2, "-1.30%" -> -1.3). */
  signedNumber(text: string | null | undefined): number {
    const m = (text ?? "").match(/-?\d+(?:[.,]\d+)?/);
    return m ? parseFloat(m[0].replace(",", ".")) : NaN;
  }

  /** Reads every basket card's subcategory, emoji and percentage. */
  async getBasketItems(): Promise<BasketItem[]> {
    const count = await this.basketCards.count();
    const items: BasketItem[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.basketCards.nth(i);
      const id = await card.getAttribute("id");
      const subcategoria = id?.startsWith("item-") ? id.slice("item-".length) : null;
      const pct = (await card.locator('[id$="-pct"]').first().textContent())?.trim() ?? "";
      const emoji = (await card.locator("span").first().textContent())?.trim() ?? "";
      items.push({ subcategoria, emoji, pct, value: this.signedNumber(pct) });
    }
    return items;
  }

  /**
   * The villains: up to `n` basket items that actually went UP (value > 0),
   * descending. Returns [] when every item is flat/negative (no villains).
   */
  async getVillainItems(n = 3): Promise<BasketItem[]> {
    const items = await this.getBasketItems();
    return items
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }

  // ---------- Bars ----------

  async getBarCount(): Promise<number> {
    return this.barItems.count();
  }

  /** A bar by podium rank (1 = highest %). */
  barByRank(rank: number): Locator {
    return this.page.locator(`#villain-bar-${rank}`);
  }

  async getBarPct(rank: number): Promise<string | null> {
    return this.page.locator(`#villain-bar-${rank}-pct`).textContent();
  }

  async getBarEmoji(rank: number): Promise<string | null> {
    const text = await this.page
      .locator(`#villain-bar-${rank} span.text-6xl`)
      .first()
      .textContent();
    return text?.trim() ?? null;
  }

  /** Expected emoji for a basket subcategory (from the shared map). */
  expectedEmoji(subcategoria: string | null): string | undefined {
    return subcategoria ? ITEM_EMOJIS[subcategoria] : undefined;
  }

  // ---------- Bar tooltip (opacity-animated, always in the DOM) ----------

  /** The hover tooltip for a bar (id="villain-bar-<rank>-tooltip"). */
  barTooltip(rank: number): Locator {
    return this.page.locator(`#villain-bar-${rank}-tooltip`);
  }

  async getBarTooltipOpacity(rank: number): Promise<number> {
    const t = this.barTooltip(rank);
    if (!(await t.count())) return 0;
    return Number(await t.evaluate((el) => window.getComputedStyle(el).opacity));
  }

  async isBarTooltipVisible(rank: number): Promise<boolean> {
    return (await this.getBarTooltipOpacity(rank)) > 0.5;
  }

  /** Hovers a bar and waits for its tooltip to fade in (opacity 0 -> 1). */
  async hoverBarByRank(rank: number) {
    await this.barByRank(rank).hover();
    await expect
      .poll(() => this.getBarTooltipOpacity(rank), { timeout: 2000 })
      .toBeGreaterThan(0.5);
  }

  /** The percentage text shown in a bar's tooltip. */
  async getBarTooltipPct(rank: number): Promise<string | null> {
    return this.page.locator(`#villain-bar-${rank}-pct`).textContent();
  }

  // ---------- Villain summary cards (price / wage) ----------

  vilaoCard(index: number): Locator {
    return this.page.locator('[data-testid="vilao-card"], [class*="vilao-card"]').nth(index);
  }

  async getVilaoCardCount(): Promise<number> {
    return this.page.locator('[data-testid="vilao-card"], [class*="vilao-card"]').count();
  }

  async getVilaoCardPrice(card: Locator): Promise<string | null> {
    return card.locator('[data-testid="price"], [class*="price"]').first().textContent();
  }

  async getSalarioPercentageText(): Promise<string | null> {
    return this.salarioCard
      .locator('[data-testid="percentage"], [class*="percentage"]')
      .first()
      .textContent();
  }

  async getMinimumWageText(): Promise<string | null> {
    return this.salarioCard
      .locator('[data-testid="wage-value"], [class*="wage"], [class*="value"]')
      .first()
      .textContent();
  }

  async getBasicaoPriceText(): Promise<string | null> {
    return this.priceCard
      .locator('[data-testid="basicao-price"], [class*="price"]')
      .first()
      .textContent();
  }

  // ---------- Parsing helper ----------

  parseNumber(text: string | null | undefined): number {
    return parseFloat((text ?? "").replace(/[^\d.,]/g, "").replace(",", ".") || "0");
  }
}
