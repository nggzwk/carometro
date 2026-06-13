import { test, expect } from "../fixtures";
import { assertShape } from "../assertions";
import type { VegetableClient } from "../clients/VegetableClient";

// --- parametrized suite for list endpoints that accept ?month_ref= ---
type MonthRefEndpoint = {
  label: string;
  getAll: (c: VegetableClient) => ReturnType<VegetableClient["getWage"]>;
  getFiltered: (c: VegetableClient, m: string) => ReturnType<VegetableClient["getWage"]>;
  assertEntry: (e: Record<string, unknown>) => void;
};

const MONTH_REF_ENDPOINTS: MonthRefEndpoint[] = [
  {
    label: "/api/vegetable-basket/wage",
    getAll: (c) => c.getWage(),
    getFiltered: (c, m) => c.getWage(m),
    assertEntry: assertShape.wage,
  },
  {
    label: "/api/vegetable-basket/hours",
    getAll: (c) => c.getHours(),
    getFiltered: (c, m) => c.getHours(m),
    assertEntry: assertShape.hours,
  },
  {
    label: "/api/vegetable-basket/inflation/month",
    getAll: (c) => c.getInflationMonth(),
    getFiltered: (c, m) => c.getInflationMonth(m),
    assertEntry: assertShape.inflationMonth,
  },
];

for (const ep of MONTH_REF_ENDPOINTS) {
  test.describe(`GET ${ep.label}`, () => {
    test("returns 200 list", async ({ vegetable }) => {
      const res = await ep.getAll(vegetable);
      expect(res.status()).toBe(200);
      expect(Array.isArray(await res.json())).toBeTruthy();
    });

    test("with valid month_ref returns filtered entry", async ({ vegetable }) => {
      const body = await (await ep.getAll(vegetable)).json();
      if (!body.length) { test.skip(); return; }
      const month: string = body[0].month_ref;
      const res = await ep.getFiltered(vegetable, month);
      expect(res.status()).toBe(200);
      expect((await res.json())[0].month_ref).toBe(month);
    });

    test("response shape is correct", async ({ vegetable }) => {
      const body = await (await ep.getAll(vegetable)).json();
      if (!body.length) return;
      ep.assertEntry(body[0]);
    });

    test("month_ref longer than 7 chars returns 422", async ({ vegetable }) => {
      expect((await ep.getFiltered(vegetable, "2023-01-TOOLONG")).status()).toBe(422);
    });

    test("nonexistent month_ref returns 404", async ({ vegetable }) => {
      expect((await ep.getFiltered(vegetable, "9999-99")).status()).toBe(404);
    });
  });
}

// --- unique endpoints ---
test.describe("GET /api/vegetable-basket/items/price", () => {
  test("returns 200 with basket_items and items arrays", async ({ vegetable }) => {
    const res = await vegetable.getItemsPrice();
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.basket_items)).toBeTruthy();
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test("with valid month_ref all items belong to that month", async ({ vegetable }) => {
    const all = await (await vegetable.getItemsPrice()).json();
    if (!all.items.length) { test.skip(); return; }
    const month: string = all.items[0].month_ref;
    const body = await (await vegetable.getItemsPrice(month)).json();
    for (const item of body.items) expect(item.month_ref).toBe(month);
  });

  test("item shape is correct", async ({ vegetable }) => {
    const body = await (await vegetable.getItemsPrice()).json();
    if (!body.items.length) return;
    assertShape.basketItem(body.items[0]);
  });

  test("month_ref longer than 7 chars returns 422", async ({ vegetable }) => {
    expect((await vegetable.getItemsPrice("2023-01-TOOLONG")).status()).toBe(422);
  });

  test("nonexistent month_ref returns 404", async ({ vegetable }) => {
    const res = await vegetable.getItemsPrice("9999-99");
    expect(res.status()).toBe(404);
    expect((await res.json()).detail).toContain("No data found");
  });
});

test.describe("GET /api/vegetable-basket/villains", () => {
  test("returns 200 list", async ({ vegetable }) => {
    const res = await vegetable.getVillains();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("with valid year all entries belong to that year", async ({ vegetable }) => {
    const body = await (await vegetable.getVillains()).json();
    if (!body.length) { test.skip(); return; }
    const year: string = body[0].month_ref.slice(0, 4);
    const filtered = await (await vegetable.getVillains(Number(year))).json();
    for (const entry of filtered) expect(entry.month_ref).toMatch(new RegExp(`^${year}`));
  });

  test("response shape is correct", async ({ vegetable }) => {
    const body = await (await vegetable.getVillains()).json();
    if (!body.length) return;
    assertShape.villains(body[0]);
  });

  test("year above maximum returns 422", async ({ vegetable }) => {
    expect((await vegetable.getVillains(9999)).status()).toBe(422);
  });

  test("year below minimum (2022) returns 422", async ({ vegetable }) => {
    expect((await vegetable.getVillains(2000)).status()).toBe(422);
  });
});

test.describe("GET /api/vegetable-basket/inflation/annual", () => {
  test("returns 200 list", async ({ vegetable }) => {
    const res = await vegetable.getInflationAnnual();
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("response shape is correct", async ({ vegetable }) => {
    const body = await (await vegetable.getInflationAnnual()).json();
    if (!body.length) return;
    assertShape.annualInflation(body[0]);
  });

  test("entries are ordered by year ascending", async ({ vegetable }) => {
    const body = await (await vegetable.getInflationAnnual()).json();
    for (let i = 1; i < body.length; i++) {
      expect(body[i].year).toBeGreaterThanOrEqual(body[i - 1].year);
    }
  });
});
