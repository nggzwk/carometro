import { Page, Locator, expect } from "@playwright/test";

export class LineGraphPage {
  readonly page: Page;

  readonly graph: Locator;
  readonly title: Locator;
  readonly legend: Locator;
  readonly tooltip: Locator;
  readonly legendItems: Locator;
  readonly dots: Locator;

  constructor(page: Page) {
    this.page = page;
    this.graph = page.locator("div[id='line-graph-chart'] div[class='recharts-responsive-container'] div div[class='recharts-wrapper'] svg");
    this.title = page.locator("#line-graph-title");
    this.legend = page.locator("#line-graph-legend");
    this.tooltip = page.locator("#line-graph-tooltip");
    this.legendItems = page.locator('[id^="line-legend-"]');
    this.dots = page.locator('[id^="line-dot-"]');
  }

  // ---------- Navigation ----------

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async ready() {
    await expect(this.graph).toBeVisible({ timeout: 10000 });
    await this.graph.scrollIntoViewIfNeeded();
    await expect(this.graph).toBeVisible({ timeout: 5000 });
    await this.dots.first().waitFor({ state: "attached", timeout: 10000 });
  }

  // ---------- Legend ----------

  legendItem(subcategoria: number): Locator {
    return this.page.locator(`#line-legend-${subcategoria}`);
  }

  async getLegendItemCount(): Promise<number> {
    return this.legendItems.count();
  }

  async getActiveLegendItemId(): Promise<string | null> {
    const items = await this.legendItems.all();
    for (const item of items) {
      if ((await item.getAttribute("aria-pressed")) === "true") {
        return item.getAttribute("id");
      }
    }
    return null;
  }

  async clickLegendItem(subcategoria: number) {
    await this.legendItem(subcategoria).click();
  }

  // ---------- Dots ----------

  dot(year: string): Locator {
    return this.page.locator(`#line-dot-${year}`);
  }

  async getDotYears(): Promise<string[]> {
    const ids = await this.dots.evaluateAll((els) => els.map((el) => el.id));
    return ids.map((id) => id.replace("line-dot-", ""));
  }

  private async dotCenter(year: string): Promise<{ x: number; y: number }> {
    const box = await this.dot(year).boundingBox();
    if (!box) throw new Error(`Dot for year ${year} not found in DOM`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async hoverDot(year: string) {
    const { x, y } = await this.dotCenter(year);
    await this.page.mouse.move(x, y);
    await expect(this.tooltip).toBeVisible({ timeout: 2000 });
  }

  async clickDot(year: string) {
    const { x, y } = await this.dotCenter(year);
    await this.page.mouse.click(x, y);
    await expect(this.tooltip).toBeVisible({ timeout: 2000 });
  }

  // ---------- Tooltip ----------

  async isTooltipVisible(): Promise<boolean> {
    return this.tooltip.isVisible().catch(() => false);
  }

  async getTooltipText(): Promise<string | null> {
    return this.tooltip.textContent();
  }

  async dismissTooltip() {
    const titleBox = await this.page.locator("#line-graph-title").boundingBox();
    if (!titleBox) throw new Error("Locator not found");
    await this.page.locator("#line-graph-title").click();
    await expect(this.tooltip).toBeHidden({ timeout: 2000 });
  }
}
