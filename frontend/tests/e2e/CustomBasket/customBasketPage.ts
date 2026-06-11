import { Page, Locator, expect } from "@playwright/test";

export class CustomBasketPage {
  readonly page: Page;

  // ---- Ring ---------------------------------------------------------------
  readonly itemCircles: Locator;
  readonly cartCircle: Locator;

  // ---- Menu toggle --------------------------------------------------------
  readonly menuNextBtn: Locator;
  readonly menuPrevBtn: Locator;

  // ---- Over-limit toast ---------------------------------------------------
  readonly overLimitToast: Locator;

  // ---- TotalCart card -----------------------------------------------------
  readonly totalCartTrigger: Locator;
  readonly totalCartBody: Locator;
  readonly totalCartLines: Locator;
  readonly lineSubtotals: Locator;
  readonly totalBig: Locator;
  readonly clearBtn: Locator;
  readonly itemCountLabel: Locator;

  constructor(page: Page) {
    this.page = page;

    this.itemCircles = page.locator("button.custom-item-circle");
    this.cartCircle = page.locator("button.custom-cart-circle");

    this.menuNextBtn = page
      .locator('button[aria-label="Próximo menu"]')
      .first();
    this.menuPrevBtn = page
      .locator('button[aria-label="Menu anterior"]')
      .first();

    this.overLimitToast = page.getByText("Limite de 300 itens atingido");

    this.totalCartTrigger = page.locator("button.total-cart__trigger").first();
    this.totalCartBody = page.locator("#total-cart-body");
    this.totalCartLines = page.locator(".total-cart__line");
    this.lineSubtotals = page.locator(".total-cart__line-subtotal");
    this.totalBig = page.locator(".total-cart__total-big").first();
    this.clearBtn = page.locator("button.total-cart__clear").first();
    this.itemCountLabel = page.locator(".total-cart__label").first();
  }

  // ---- Navigation ---------------------------------------------------------

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.cartCircle.scrollIntoViewIfNeeded();
  }

  // ---- Menu ---------------------------------------------------------------

  async currentMenuLabel(): Promise<"BASICÃO" | "FEIRÃO"> {
    const isBasicao = await this.page
      .getByText("BASICÃO", { exact: true })
      .isVisible()
      .catch(() => false);
    return isBasicao ? "BASICÃO" : "FEIRÃO";
  }

  async switchMenu() {
    await this.menuNextBtn.click();
    await this.page.waitForTimeout(350);
  }

  async ensureBasicao() {
    if ((await this.currentMenuLabel()) !== "BASICÃO") await this.switchMenu();
  }

  async ensureFeirao() {
    if ((await this.currentMenuLabel()) !== "FEIRÃO") await this.switchMenu();
  }

  // ---- Ring interactions --------------------------------------------------

  async clickItem(index: number) {
    await this.itemCircles.nth(index).click();
  }

  async clickItemNTimes(index: number, times: number) {
    const item = this.itemCircles.nth(index);
    await item.scrollIntoViewIfNeeded();
    for (let i = 0; i < times; i++) {
      await item.click();
    }
  }

  async clickAllItemsNTimes(times: number) {
    const count = await this.itemCircles.count();
    for (let idx = 0; idx < count; idx++) {
      await this.clickItemNTimes(idx, times);
    }
  }

  // ---- TotalCart ----------------------------------------------------------

  async openTotalCart() {
    const open = await this.totalCartBody.isVisible().catch(() => false);
    if (!open) {
      await this.totalCartTrigger.click();
      await expect(this.totalCartBody).toBeVisible({ timeout: 2000 });
    }
  }

  async closeTotalCart() {
    const open = await this.totalCartBody.isVisible().catch(() => false);
    if (open) {
      await this.totalCartTrigger.click();
      await expect(this.totalCartBody).not.toBeVisible({ timeout: 2000 });
    }
  }

  async clearCart() {
    await this.openTotalCart();
    await this.clearBtn.click();
  }

  async getItemCountText(): Promise<string> {
    return (await this.itemCountLabel.textContent()) ?? "";
  }

  async getLineSubtotalValues(): Promise<number[]> {
    await this.openTotalCart();
    const texts = await this.lineSubtotals.allTextContents();
    return texts.map((t) => this.parseBrl(t));
  }

  async getDisplayedTotal(): Promise<number> {
    const text = await this.totalBig.textContent();
    return this.parseBrl(text ?? "0");
  }

  // ---- Helpers ------------------------------------------------------------

  parseBrl(text: string): number {
    const cleaned = text
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".");
    return parseFloat(cleaned) || 0;
  }
}
