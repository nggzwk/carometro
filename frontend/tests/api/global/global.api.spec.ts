import { test, expect } from "../fixtures";
import { assertShape } from "../assertions";
import type { GlobalClient } from "../clients/GlobalClient";

// --- parametrized suite for list endpoints that accept ?month_ref= ---
type MonthRefEndpoint = {
  label: string;
  getAll: (c: GlobalClient) => ReturnType<GlobalClient["getDieeseWage"]>;
  getFiltered: (c: GlobalClient, m: string) => ReturnType<GlobalClient["getDieeseWage"]>;
  assertEntry: (e: Record<string, unknown>) => void;
};

const MONTH_REF_ENDPOINTS: MonthRefEndpoint[] = [
  {
    label: "/api/global-baskets/dieese/wage",
    getAll: (c) => c.getDieeseWage(),
    getFiltered: (c, m) => c.getDieeseWage(m),
    assertEntry: assertShape.wage,
  },
];

for (const ep of MONTH_REF_ENDPOINTS) {
  test.describe(`GET ${ep.label}`, () => {
    test("returns 200 list", async ({ globalBaskets }) => {
      const res = await ep.getAll(globalBaskets);
      expect(res.status()).toBe(200);
      expect(Array.isArray(await res.json())).toBeTruthy();
    });

    test("with valid month_ref returns filtered entry", async ({ globalBaskets }) => {
      const body = await (await ep.getAll(globalBaskets)).json();
      if (!body.length) { test.skip(); return; }
      const month: string = body[0].month_ref;
      const res = await ep.getFiltered(globalBaskets, month);
      expect(res.status()).toBe(200);
      expect((await res.json())[0].month_ref).toBe(month);
    });

    test("response shape is correct", async ({ globalBaskets }) => {
      const body = await (await ep.getAll(globalBaskets)).json();
      if (!body.length) return;
      ep.assertEntry(body[0]);
    });

    test("month_ref longer than 7 chars returns 400", async ({ globalBaskets }) => {
      expect((await ep.getFiltered(globalBaskets, "2023-01-TOOLONG")).status()).toBe(400);
    });

    test("nonexistent month_ref returns 404", async ({ globalBaskets }) => {
      expect((await ep.getFiltered(globalBaskets, "9999-99")).status()).toBe(404);
    });
  });
}

// --- unique endpoints ---
test.describe("GET /api/global-baskets", () => {
  test("returns 200 list", async ({ globalBaskets }) => {
    const res = await globalBaskets.getReferences();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("response shape is correct", async ({ globalBaskets }) => {
    const body = await (await globalBaskets.getReferences()).json();
    if (!body.length) return;
    assertShape.globalBasket(body[0]);
  });

  test("includes BRL and USD entries", async ({ globalBaskets }) => {
    const body = await (await globalBaskets.getReferences()).json();
    const codes = body.map((e: { local_currency_code: string }) => e.local_currency_code);
    expect(codes).toContain("BRL");
    expect(codes).toContain("USD");
  });
});

test.describe("GET /api/global-baskets/dieese", () => {
  test("returns 200 with basket_items_dieese and items arrays", async ({ globalBaskets }) => {
    const res = await globalBaskets.getDieeseItems();
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.basket_items_dieese)).toBeTruthy();
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test("with valid month_ref all items belong to that month", async ({ globalBaskets }) => {
    const all = await (await globalBaskets.getDieeseItems()).json();
    if (!all.items.length) { test.skip(); return; }
    const month: string = all.items[0].month_ref;
    const body = await (await globalBaskets.getDieeseItems(month)).json();
    for (const item of body.items) expect(item.month_ref).toBe(month);
  });

  test("item shape is correct", async ({ globalBaskets }) => {
    const body = await (await globalBaskets.getDieeseItems()).json();
    if (!body.items.length) return;
    assertShape.dieeseItem(body.items[0]);
  });

  test("month_ref longer than 7 chars returns 400", async ({ globalBaskets }) => {
    expect((await globalBaskets.getDieeseItems("2023-01-TOOLONG")).status()).toBe(400);
  });

  test("nonexistent month_ref returns 404", async ({ globalBaskets }) => {
    expect((await globalBaskets.getDieeseItems("9999-99")).status()).toBe(404);
  });
});

test.describe("GET /api/global-baskets/dieese/inflation/annual", () => {
  test("returns 200 list", async ({ globalBaskets }) => {
    const res = await globalBaskets.getDieeseInflationAnnual();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("response shape is correct", async ({ globalBaskets }) => {
    const body = await (await globalBaskets.getDieeseInflationAnnual()).json();
    if (!body.length) return;
    assertShape.annualInflation(body[0]);
  });

  test("entries are ordered by year ascending", async ({ globalBaskets }) => {
    const body = await (await globalBaskets.getDieeseInflationAnnual()).json();
    for (let i = 1; i < body.length; i++) {
      expect(body[i].year).toBeGreaterThanOrEqual(body[i - 1].year);
    }
  });
});
