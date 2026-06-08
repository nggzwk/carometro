import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatUsd,
  formatPercent,
  formatHours,
  translateCountry,
  getGlobalBasketRanking,
  type GlobalBasketRow,
} from "../../src/lib/globalBaskets";

// ─── pure formatters ──────────────────────────────────────────────────────────

describe("formatUsd", () => {
  it("returns '-' for null", () => {
    expect(formatUsd(null)).toBe("-");
  });

  it("formats a positive value as USD", () => {
    expect(formatUsd(1.5)).toBe("$1.50");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("formats a large value", () => {
    expect(formatUsd(1234.56)).toBe("$1,234.56");
  });
});

describe("formatPercent", () => {
  it("returns '-' for null", () => {
    expect(formatPercent(null)).toBe("-");
  });

  it("formats value with two decimal places and % suffix", () => {
    expect(formatPercent(42.5)).toMatch(/42,50%/);
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toMatch(/0,00%/);
  });
});

describe("formatHours", () => {
  it("returns '-' for null", () => {
    expect(formatHours(null)).toBe("-");
  });

  it("formats value with one decimal place and ' h' suffix", () => {
    expect(formatHours(8.5)).toMatch(/8,5 h/);
  });

  it("formats integer hours with one decimal place", () => {
    expect(formatHours(40)).toMatch(/40,0 h/);
  });
});

describe("translateCountry", () => {
  it("translates known country names to Portuguese", () => {
    expect(translateCountry("Brazil")).toBe("Brasil");
    expect(translateCountry("Germany")).toBe("Alemanha");
    expect(translateCountry("USA")).toBe("EUA");
  });

  it("returns the original name for unknown countries", () => {
    expect(translateCountry("France")).toBe("France");
    expect(translateCountry("")).toBe("");
  });
});

// ─── getGlobalBasketRanking (fetch-dependent) ─────────────────────────────────

const makeRow = (overrides: Partial<GlobalBasketRow> = {}): GlobalBasketRow => ({
  id: 1,
  country_region: "Brazil",
  responsible_authority: "DIEESE",
  raw_monthly_min_wage: 1412,
  raw_basket_cost: 700,
  workweek_hours: 44,
  last_updated_at: null,
  rate_to_usd: 5,
  rate_updated_at: null,
  monthly_min_wage_usd: "282.40",
  basket_cost_usd: "140.00",
  monthly_min_wage_brl: "1412.00",
  basket_cost_brl: "700.00",
  ...overrides,
});

describe("getGlobalBasketRanking", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await getGlobalBasketRanking();
    expect(result).toEqual([]);
  });

  it("returns empty array when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    const result = await getGlobalBasketRanking();
    expect(result).toEqual([]);
  });

  it("ranks rows by wage_pct descending", async () => {
    const rows: GlobalBasketRow[] = [
      makeRow({ id: 1, country_region: "Brazil", basket_cost_usd: "140", monthly_min_wage_usd: "280" }),  // 50%
      makeRow({ id: 2, country_region: "USA",    basket_cost_usd: "100", monthly_min_wage_usd: "1000" }), // 10%
      makeRow({ id: 3, country_region: "India",  basket_cost_usd: "200", monthly_min_wage_usd: "250" }),  // 80%
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => rows,
      } as Response),
    );

    const result = await getGlobalBasketRanking();
    expect(result[0].country_region).toBe("India");
    expect(result[1].country_region).toBe("Brazil");
    expect(result[2].country_region).toBe("USA");
  });

  it("assigns sequential rank starting at 1", async () => {
    const rows: GlobalBasketRow[] = [
      makeRow({ id: 1, basket_cost_usd: "50", monthly_min_wage_usd: "100" }),
      makeRow({ id: 2, basket_cost_usd: "40", monthly_min_wage_usd: "100" }),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rows } as Response),
    );

    const result = await getGlobalBasketRanking();
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it("respects the limit parameter", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ id: i + 1, basket_cost_usd: String(100 - i * 10), monthly_min_wage_usd: "200" }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rows } as Response),
    );

    const result = await getGlobalBasketRanking(3);
    expect(result).toHaveLength(3);
  });

  it("skips rows with null or zero wage", async () => {
    const rows: GlobalBasketRow[] = [
      makeRow({ id: 1, basket_cost_usd: "100", monthly_min_wage_usd: null }),
      makeRow({ id: 2, basket_cost_usd: "100", monthly_min_wage_usd: "0" }),
      makeRow({ id: 3, basket_cost_usd: "50", monthly_min_wage_usd: "200" }),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rows } as Response),
    );

    const result = await getGlobalBasketRanking();
    expect(result).toHaveLength(1);
    expect(result[0].country_region).toBe("Brazil");
  });

  it("calculates hours_needed correctly", async () => {
    // basket=$100, wage=$400, weekHours=40 → monthlyHours=40*(52/12)≈173.33 → hours=(100/400)*173.33≈43.33
    const rows: GlobalBasketRow[] = [
      makeRow({ basket_cost_usd: "100", monthly_min_wage_usd: "400", workweek_hours: 40 }),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rows } as Response),
    );

    const result = await getGlobalBasketRanking();
    expect(result[0].hours_needed).toBeCloseTo(43.33, 1);
  });
});
