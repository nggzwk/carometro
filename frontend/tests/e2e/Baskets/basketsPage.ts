import { Page, Locator, expect } from "@playwright/test";

export const BASICAO_EMOJIS: Record<string, string> = {
  "40003": "🍚", // Arroz
  "40012": "🫘", // Feijão
  "60001": "🫙", // Óleo
  "40017": "🍞", // Trigo
  "90001": "☕", // Café
  "30001": "🥛", // Leite
  "80002": "🍬", // Açúcar
  "20001": "🍳", // Ovos
  "10011": "🍗", // Frango
  "10023": "🥩", // Carne
};

export const FEIRAO_EMOJIS: Record<string, string> = {
  "50008": "🍅", // Tomate Comum
  "50025": "🍌", // Banana Prata
  "50005": "🥔", // Batata Inglesa
  "50002": "🧅", // Cebola
  "50079": "🥬", // Alface Americana
  "50080": "🥬", // Alface (Lisa fallback)
  "50007": "🥕", // Cenoura
  "50021": "🍊", // Laranja Pera
  "50017": "🎃", // Abóbora
  "50029": "🍎", // Maçã Gala
  "50028": "🍎", // Maçã Fuji
  "50004": "🍠", // Batata Doce
};

export const ITEM_EMOJIS: Record<string, string> = {
  ...BASICAO_EMOJIS,
  ...FEIRAO_EMOJIS,
};

export const BASICAO_SUBCATEGORIES = Object.keys(BASICAO_EMOJIS);
export const FEIRAO_SUBCATEGORIES = Object.keys(FEIRAO_EMOJIS);

export class BasketsPage {
  readonly page: Page;

  readonly historicoButton: Locator;
  readonly basicaoButton: Locator;
  readonly feiraoButton: Locator;

  readonly mensalLabel: Locator;
  readonly acumuladoLabel: Locator;

  readonly basketCards: Locator;

  readonly inflationLabel: Locator;
  readonly inflationValue: Locator;

  readonly tooltip: Locator;
  readonly helpIcon: Locator;
  readonly helpTooltip: Locator;

  readonly monthOptions: Locator;

  constructor(page: Page) {
    this.page = page;

    this.historicoButton = page.locator('button:has-text("Histórico")').first();
    this.basicaoButton = page
      .locator('button:has-text("Basicão"), button:has-text("BASICÃO")')
      .first();
    this.feiraoButton = page
      .locator('button:has-text("Feirão"), button:has-text("FEIRÃO")')
      .first();

    this.mensalLabel = page.locator("text=/MENSAL|mensal/i").first();
    this.acumuladoLabel = page.locator("text=/ACUMULADO|acumulado/i").first();

    this.basketCards = page.locator("#item-grid > div");

    this.inflationLabel = page.locator("#header-inflation-label").first();
    this.inflationValue = page
      .locator(
        '[data-testid="inflation-value"], .inflation-value, [class*="value"]',
      )
      .first();

    this.tooltip = page.locator("#header-hint-tooltip");
    this.helpIcon = page
      .locator('button[aria-label^="Inflação da cesta"]')
      .first();
    this.helpTooltip = this.helpIcon.locator("span").first();

    this.monthOptions = page.locator('button[id^="btn-month-"]');
  }

  // ---------- Navigation ----------

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async clickHistoricoButton() {
    await this.historicoButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async openBasicao() {
    if (
      await this.basicaoButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await this.basicaoButton.click();
      await this.page.waitForLoadState("networkidle");
    }
  }

  async openFeirao() {
    await expect(this.feiraoButton).toBeVisible({ timeout: 5000 });

    const basicaoValue = (await this.getInflationValue())?.trim();

    await this.feiraoButton.click();
    await this.page.waitForLoadState("networkidle");

    if (basicaoValue) {
      await expect
        .poll(async () => (await this.getInflationValue())?.trim(), {
          timeout: 7000,
        })
        .not.toBe(basicaoValue);
    }
  }

  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  }

  // ---------- Card-relative locators ----------

  card(index: number): Locator {
    return this.basketCards.nth(index);
  }

  cardBySubcategory(subcategoria: string): Locator {
    return this.page.locator(`#item-${subcategoria}`);
  }

  async getCardSubcategory(card: Locator): Promise<string | null> {
    const id = await card.getAttribute("id");
    return id?.startsWith("item-") ? id.slice("item-".length) : null;
  }

  cardName(card: Locator): Locator {
    return card.locator('[id$="-name"]');
  }

  cardEmoji(card: Locator): Locator {
    return card.locator("span").first();
  }

  cardPercentage(card: Locator): Locator {
    return card.locator('[id$="-pct"]');
  }

  cardArrow(card: Locator): Locator {
    return card.locator('[id$="-pct"] + span');
  }

  cardEqualSign(card: Locator): Locator {
    return card.locator('[id$="-pct"] + span');
  }

  // ---------- Card queries / actions ----------

  async getCardCount(): Promise<number> {
    return this.basketCards.count();
  }

  async clickCard(card: Locator) {
    await card.click();
    await this.page.waitForLoadState("networkidle");
  }

  async getCardName(card: Locator): Promise<string | null> {
    return this.cardName(card).textContent();
  }

  async getCardEmoji(card: Locator): Promise<string | null> {
    return this.cardEmoji(card).textContent();
  }

  async getCardPercentage(card: Locator): Promise<string | null> {
    return this.cardPercentage(card).textContent();
  }

  async getCardArrow(card: Locator): Promise<string | null> {
    return this.cardArrow(card).textContent();
  }

  async getCardEqualSign(card: Locator): Promise<string | null> {
    return this.cardEqualSign(card).textContent();
  }

  async getCardBorderColor(card: Locator): Promise<string> {
    return card.evaluate((el) => window.getComputedStyle(el).borderColor);
  }

  async forEachCard(
    callback: (card: Locator, index: number) => Promise<void>,
    limit = 3,
  ) {
    const count = await this.getCardCount();
    for (let i = 0; i < Math.min(count, limit); i++) {
      await callback(this.card(i), i);
    }
  }

  // ---------- Tooltip ----------

  async hover(locator: Locator) {
    await locator.hover();
    await this.page.waitForTimeout(500);
  }

  async getTooltipOpacity(): Promise<number> {
    if (!(await this.tooltip.count())) return 0;
    const opacity = await this.tooltip.evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    return Number(opacity);
  }

  async isTooltipVisible(): Promise<boolean> {
    return (await this.getTooltipOpacity()) > 0.5;
  }

  async getTooltipText(): Promise<string | null> {
    await expect
      .poll(() => this.getTooltipOpacity(), { timeout: 2000 })
      .toBeGreaterThan(0.5);
    return this.tooltip.textContent();
  }

  async expectTooltipHidden(timeout = 6000) {
    await expect
      .poll(() => this.getTooltipOpacity(), { timeout })
      .toBeLessThan(0.1);
  }

  // ---------- Inflation / help ----------

  async getInflationValue(): Promise<string | null> {
    return this.inflationLabel.textContent();
  }

  async clickHelpIcon() {
    await expect(this.helpIcon).toBeVisible({ timeout: 5000 });
    await this.helpIcon.click();
  }

  async isHelpIconVisible(): Promise<boolean> {
    return this.helpIcon.isVisible().catch(() => false);
  }

  async getHelpTooltipOpacity(): Promise<number> {
    if (!(await this.helpTooltip.count())) return 0;
    const opacity = await this.helpTooltip.evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    return Number(opacity);
  }

  async isHelpTooltipVisible(): Promise<boolean> {
    return (await this.getHelpTooltipOpacity()) > 0.5;
  }

  async getHelpTooltipText(): Promise<string | null> {
    await expect
      .poll(() => this.getHelpTooltipOpacity(), { timeout: 2000 })
      .toBeGreaterThan(0.5);
    return this.helpTooltip.textContent();
  }

  async getHelpIconText(): Promise<string | null> {
    return this.helpIcon.textContent();
  }

  // ---------- Month selection ----------
  async openHistorico() {
    await this.historicoButton.click();
    await this.monthOptions
      .first()
      .waitFor({ state: "attached", timeout: 5000 })
      .catch(() => {});
  }

  async getMonthOptionCount(): Promise<number> {
    await this.monthOptions
      .first()
      .waitFor({ state: "attached", timeout: 5000 })
      .catch(() => {});
    return this.monthOptions.count();
  }

  async getMonthRefs(): Promise<string[]> {
    await this.monthOptions
      .first()
      .waitFor({ state: "attached", timeout: 5000 })
      .catch(() => {});
    const ids = await this.monthOptions.evaluateAll((els) =>
      els.map((el) => el.id),
    );
    return ids.map((id) => id.replace("btn-month-", ""));
  }

  monthOption(ref: string): Locator {
    return this.page.locator(`#btn-month-${ref}`);
  }

  async selectMonth(index: number): Promise<string> {
    const option = this.monthOptions.nth(index);
    const id = (await option.getAttribute("id")) ?? "";
    await option.click();
    await this.page.waitForLoadState("networkidle");
    return id.replace("btn-month-", "");
  }

  /** Clicks a month pill by ref and returns it. */
  async selectMonthByRef(ref: string): Promise<string> {
    await this.monthOption(ref).click();
    await this.page.waitForLoadState("networkidle");
    return ref;
  }

  async selectMonthAndReadValue(
    ref: string,
    previousValue?: string,
  ): Promise<string | undefined> {
    await this.monthOption(ref).click();
    await this.page.waitForLoadState("networkidle");
    if (previousValue !== undefined) {
      await expect
        .poll(async () => (await this.getInflationValue())?.trim(), {
          timeout: 7000,
        })
        .not.toBe(previousValue);
    }
    return (await this.getInflationValue())?.trim();
  }

  async isMonthActive(ref: string): Promise<boolean> {
    const bg = await this.monthOption(ref).evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    return /rgb\(\s*168,\s*155,\s*140\s*\)/i.test(bg);
  }

  async closeMonthPanel() {
    // The panel is toggled by the Histórico button.
    await this.clickHistoricoButton();
  }

  // ---------- Border color assertions (sync, pure) ----------

  // Inflation border = var(--color-inflation) = #E63946 = rgb(230, 57, 70).
  isRedBorder(borderColor: string): boolean {
    return (
      /rgb\(\s*230,\s*57,\s*70\s*\)/i.test(borderColor) ||
      /#e63946/i.test(borderColor)
    );
  }

  // Deflation/neutral border = var(--color-deflation) = #2A9D8F = rgb(42, 157, 143).
  isGreenBorder(borderColor: string): boolean {
    return (
      /rgb\(\s*42,\s*157,\s*143\s*\)/i.test(borderColor) ||
      /#2a9d8f/i.test(borderColor)
    );
  }
}
