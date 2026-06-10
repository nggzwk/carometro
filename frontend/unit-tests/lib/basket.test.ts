import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBasketSummaryProps,
  getBasketDataForMonth,
  getAvailableMonths,
} from "../../src/lib/basket";

const makeItemsPayload = (overrides = {}) => ({
  items: [
    {
      produto_categoria: 1,
      produto_subcategoria: 10011,
      item_name: "Arroz polido",
      qtd_embalagem: "5kg",
      month_ref: "2024-01",
      month_price: "25.90",
      previous_price: "24.50",
      mom_pct: 5.71,
      ipca_monthly_pct: 0.42,
      ...overrides,
    },
  ],
});

const makeInflationPayload = (overrides = {}) => [
  {
    month_ref: "2024-01",
    basket_difference_brl: 45.5,
    inflation_pct: 3.2,
    ipca_monthly_pct: 0.42,
    annual_ipca_pct: 4.83,
    ...overrides,
  },
];

describe("getBasketSummaryProps", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns empty basket when items fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    const result = await getBasketSummaryProps();
    expect(result.items).toHaveLength(0);
    expect(result.totalValue).toBe(0);
    expect(result.monthlyIpca).toBeNull();
  });

  it("returns empty basket on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await getBasketSummaryProps();
    expect(result).toEqual({
      items: [],
      totalValue: 0,
      totalInflationPct: 0,
      monthlyIpca: null,
      annualIpca: null,
      ipcaMonthRef: null,
    });
  });

  it("maps item fields and converts prices to strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeItemsPayload({ month_price: 25.9, previous_price: 24.5 }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => makeInflationPayload() } as Response),
    );

    const result = await getBasketSummaryProps();
    expect(result.items[0].month_price).toBe("25.9");
    expect(result.items[0].previous_price).toBe("24.5");
  });

  it("converts null month_price to '0'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeItemsPayload({ month_price: null }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => makeInflationPayload() } as Response),
    );

    const result = await getBasketSummaryProps();
    expect(result.items[0].month_price).toBe("0");
  });

  it("populates inflation metrics from the first inflation row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeItemsPayload() } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => makeInflationPayload() } as Response),
    );

    const result = await getBasketSummaryProps();
    expect(result.totalValue).toBe(45.5);
    expect(result.totalInflationPct).toBe(3.2);
    expect(result.annualIpca).toBe(4.83);
  });
});

describe("getBasketDataForMonth", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null when items fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    const result = await getBasketDataForMonth("2024-01");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await getBasketDataForMonth("2024-01");
    expect(result).toBeNull();
  });

  it("returns basket data when both fetches succeed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeItemsPayload() } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => makeInflationPayload() } as Response),
    );

    const result = await getBasketDataForMonth("2024-01");
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.totalValue).toBe(45.5);
  });

  it("falls back to zero for inflation when inflation fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeItemsPayload() } as Response)
        .mockResolvedValueOnce({ ok: false } as Response),
    );

    const result = await getBasketDataForMonth("2024-01");
    expect(result).not.toBeNull();
    expect(result!.totalValue).toBe(0);
    expect(result!.totalInflationPct).toBe(0);
    expect(result!.monthlyIpca).toBeNull();
  });
});

describe("getAvailableMonths", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns empty array when all fetches return non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    const result = await getAvailableMonths(2020);
    expect(result).toEqual([]);
  });

  it("returns sorted unique month refs for a past year", async () => {
    // For a past year all 12 months are checked; simulate 2 returning data
    const makeMonthResponse = (month_ref: string) => ({
      ok: true,
      json: async () => ({ items: [{ month_ref }] }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(makeMonthResponse("2020-01") as Response)
        .mockResolvedValueOnce(makeMonthResponse("2020-02") as Response)
        .mockResolvedValue({ ok: false } as Response),
    );

    const result = await getAvailableMonths(2020);
    expect(result).toEqual(["2020-01", "2020-02"]);
  });
});
