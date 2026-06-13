import { test, expect } from "../fixtures";
import { assertShape } from "../assertions";
import type { BasketClient } from "../clients/BasketClient";

// --- parametrized suite for list endpoints that accept ?month_ref= ---
type MonthRefEndpoint = {
  label: string;
  getAll: (c: BasketClient) => ReturnType<BasketClient["getWage"]>;
  getFiltered: (c: BasketClient, m: string) => ReturnType<BasketClient["getWage"]>;
  assertEntry: (e: Record<string, unknown>) => void;
};

const MONTH_REF_ENDPOINTS: MonthRefEndpoint[] = [
  {
    label: "/api/basket/wage",
    getAll: (c) => c.getWage(),
    getFiltered: (c, m) => c.getWage(m),
    assertEntry: assertShape.wage,
  },
  {
    label: "/api/basket/hours",
    getAll: (c) => c.getHours(),
    getFiltered: (c, m) => c.getHours(m),
    assertEntry: assertShape.hours,
  },
  {
    label: "/api/basket/inflation/month",
    getAll: (c) => c.getInflationMonth(),
    getFiltered: (c, m) => c.getInflationMonth(m),
    assertEntry: assertShape.inflationMonth,
  },
];

for (const ep of MONTH_REF_ENDPOINTS) {
  test.describe(`GET ${ep.label}`, () => {
    test("returns 200 list", async ({ basket }) => {
      const res = await ep.getAll(basket);
      expect(res.status()).toBe(200);
      expect(Array.isArray(await res.json())).toBeTruthy();
    });

    test("with valid month_ref returns filtered entry", async ({ basket }) => {
      const body = await (await ep.getAll(basket)).json();
      if (!body.length) { test.skip(); return; }
      const month: string = body[0].month_ref;
      const res = await ep.getFiltered(basket, month);
      expect(res.status()).toBe(200);
      expect((await res.json())[0].month_ref).toBe(month);
    });

    test("response shape is correct", async ({ basket }) => {
      const body = await (await ep.getAll(basket)).json();
      if (!body.length) return;
      ep.assertEntry(body[0]);
    });

    test("month_ref longer than 7 chars returns 400", async ({ basket }) => {
      expect((await ep.getFiltered(basket, "2023-012")).status()).toBe(400);
    });

    test("nonexistent month_ref returns 404", async ({ basket }) => {
      expect((await ep.getFiltered(basket, "9999-99")).status()).toBe(404);
    });
  });
}

// --- unique endpoints ---
test.describe("GET /api/basket/items/price", () => {
  test("returns 200 with basket_items and items arrays", async ({ basket }) => {
    const res = await basket.getItemsPrice();
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.basket_items)).toBeTruthy();
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test("with valid month_ref all items belong to that month", async ({ basket }) => {
    const all = await (await basket.getItemsPrice()).json();
    if (!all.items.length) { test.skip(); return; }
    const month: string = all.items[0].month_ref;
    const body = await (await basket.getItemsPrice(month)).json();
    for (const item of body.items) expect(item.month_ref).toBe(month);
  });

  test("item shape is correct", async ({ basket }) => {
    const body = await (await basket.getItemsPrice()).json();
    if (!body.items.length) return;
    assertShape.basketItem(body.items[0]);
  });

  test("month_ref longer than 7 chars returns 400", async ({ basket }) => {
    expect((await basket.getItemsPrice("2023-012")).status()).toBe(400);
  });

  test("nonexistent month_ref returns 404", async ({ basket }) => {
    const res = await basket.getItemsPrice("9999-99");
    expect(res.status()).toBe(404);
    expect((await res.json()).detail).toContain("No data found");
  });
});

test.describe("GET /api/basket/villains", () => {
  test("returns 200 list", async ({ basket }) => {
    const res = await basket.getVillains();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("with valid year all entries belong to that year", async ({ basket }) => {
    const body = await (await basket.getVillains()).json();
    if (!body.length) { test.skip(); return; }
    const year: string = body[0].month_ref.slice(0, 4);
    const filtered = await (await basket.getVillains(Number(year))).json();
    for (const entry of filtered) expect(entry.month_ref).toMatch(new RegExp(`^${year}`));
  });

  test("response shape is correct", async ({ basket }) => {
    const body = await (await basket.getVillains()).json();
    if (!body.length) return;
    assertShape.villains(body[0]);
  });

  test("year above maximum returns 422", async ({ basket }) => {
    expect((await basket.getVillains(9999)).status()).toBe(422);
  });

  test("year below minimum (2023) returns 422", async ({ basket }) => {
    expect((await basket.getVillains(2000)).status()).toBe(422);
  });
});

test.describe("GET /api/basket/inflation/annual", () => {
  test("returns 200 list", async ({ basket }) => {
    const res = await basket.getInflationAnnual();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("response shape is correct", async ({ basket }) => {
    const body = await (await basket.getInflationAnnual()).json();
    if (!body.length) return;
    assertShape.annualInflation(body[0]);
  });

  test("entries are ordered by year ascending", async ({ basket }) => {
    const body = await (await basket.getInflationAnnual()).json();
    for (let i = 1; i < body.length; i++) {
      expect(body[i].year).toBeGreaterThanOrEqual(body[i - 1].year);
    }
  });
});
