import { Page, Locator, expect } from "@playwright/test";

export type MetricKey = "inflation" | "wageIncrease" | "ipca";

export type SubtitleKey = "dieese" | "salario" | "ipca";

export class AxisPage {
  readonly page: Page;

  readonly graph: Locator;
  readonly chart: Locator;
  readonly tooltip: Locator;
  readonly subtitles: Locator;

  readonly dots: Locator;

  readonly axisTickLabels: Locator;
  readonly xAxisLabels: Locator;
  readonly yAxisLabels: Locator;

  readonly tooltipSquares: Locator;

  readonly subtitleItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.graph = page.locator("#axis-graph");
    this.chart = page.locator("#axis-graph-chart");
    this.tooltip = page.locator("#chart-tooltip");
    this.subtitles = page.locator("#axis-subtitles");

    this.dots = page.locator('[id^="axis-dot-"]');

    this.axisTickLabels = page.locator("g.recharts-cartesian-axis-tick-label");
    this.xAxisLabels = page.locator(
      "#axis-graph .recharts-xAxis-tick-labels g.recharts-cartesian-axis-tick-label"
    );
    this.yAxisLabels = page.locator(
      "#axis-graph .recharts-yAxis-tick-labels g.recharts-cartesian-axis-tick-label"
    );

    this.tooltipSquares = this.tooltip.locator('div[id^="chart-tooltip-"]');

    this.subtitleItems = page.locator('[id^="axis-subtitle-"]');
  }

  // ---------- Navigation ----------
  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async ready() {
    await expect(this.chart).toBeVisible({ timeout: 10000 });
    await this.chart.scrollIntoViewIfNeeded();
    await this.dots.first().waitFor({ state: "attached", timeout: 10000 });
  }

  // ---------- Axis ----------
  async getXAxisYears(): Promise<string[]> {
    return (await this.xAxisLabels.allTextContents()).map((t) => t.trim());
  }

  async getYAxisLabels(): Promise<string[]> {
    return (await this.yAxisLabels.allTextContents()).map((t) => t.trim());
  }

  // ---------- Subtitles ----------
  subtitle(key: SubtitleKey): Locator {
    return this.page.locator(`#axis-subtitle-${key}`);
  }

  // ---------- Dots ----------
  dot(year: string | number): Locator {
    return this.page.locator(`#axis-dot-${year}`);
  }

  async getDotCount(): Promise<number> {
    return this.dots.count();
  }

  async getDotYears(): Promise<string[]> {
    const ids = await this.dots.evaluateAll((els) => els.map((el) => el.id));
    return ids.map((id) => id.replace("axis-dot-", ""));
  }

  async hoverDot(year: string | number) {
    await this.dot(year).hover();
    await expect(this.tooltip).toBeVisible({ timeout: 2000 });
  }

  async clickDot(year: string | number) {
    await this.dot(year).click();
    await expect(this.tooltip).toBeVisible({ timeout: 2000 });
  }

  // ---------- Tooltip ----------
  metric(key: MetricKey): Locator {
    return this.tooltip.locator(`#chart-tooltip-${key}`);
  }

  metricValue(key: MetricKey): Locator {
    return this.tooltip.locator(`#chart-tooltip-${key}-value`);
  }

  metricBrl(key: MetricKey): Locator {
    return this.tooltip.locator(`#chart-tooltip-${key}-brl`);
  }

  async getSquareCount(): Promise<number> {
    return this.tooltipSquares.count();
  }

  async hasMetric(key: MetricKey): Promise<boolean> {
    return (await this.metric(key).count()) > 0;
  }

  async getMetricValue(key: MetricKey): Promise<string | null> {
    return this.metricValue(key).textContent();
  }

  async hasMetricData(key: MetricKey): Promise<boolean> {
    return /\d/.test((await this.getMetricValue(key)) ?? "");
  }

  async expandMetric(key: MetricKey) {
    await this.metric(key).click();
  }

  async hasBrl(key: MetricKey): Promise<boolean> {
    return (await this.metricBrl(key).count()) > 0;
  }

  async getMetricBrl(key: MetricKey): Promise<string | null> {
    return this.metricBrl(key).textContent();
  }

  async isTooltipVisible(): Promise<boolean> {
    return this.tooltip.isVisible().catch(() => false);
  }

  async closeTooltipByClickingOut() {
    await this.page.mouse.click(5, 5);
    await expect(this.tooltip).toBeHidden({ timeout: 2000 });
  }
}
