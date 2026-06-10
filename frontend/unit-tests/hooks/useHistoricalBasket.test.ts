import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistoricalBasket } from "../../src/hooks/useHistoricalBasket";
import type { BasketSummaryProps } from "../../src/lib/basketTypes";

vi.mock("../../src/lib/basket", () => ({
  getBasketDataForMonth: vi.fn(),
}));

import { getBasketDataForMonth } from "../../src/lib/basket";
const mockGetBasketDataForMonth = vi.mocked(getBasketDataForMonth);

const liveProps: BasketSummaryProps = {
  items: [],
  totalValue: 100,
  totalInflationPct: 2.5,
  monthlyIpca: 0.4,
  annualIpca: 4.8,
  ipcaMonthRef: "2024-02",
};

const historicalProps: BasketSummaryProps = {
  items: [],
  totalValue: 90,
  totalInflationPct: 1.2,
  monthlyIpca: 0.3,
  annualIpca: 3.9,
  ipcaMonthRef: "2024-01",
};

describe("useHistoricalBasket", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses liveProps as activeData by default", () => {
    const { result } = renderHook(() => useHistoricalBasket(liveProps));
    expect(result.current.activeData).toBe(liveProps);
    expect(result.current.selectedMonth).toBeNull();
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it("clears historical data when month is set to null", async () => {
    mockGetBasketDataForMonth.mockResolvedValue(historicalProps);

    const { result } = renderHook(() => useHistoricalBasket(liveProps));

    await act(async () => {
      await result.current.handleMonthSelect("2024-01");
    });
    expect(result.current.activeData).toEqual(historicalProps);

    await act(async () => {
      await result.current.handleMonthSelect(null);
    });
    expect(result.current.activeData).toBe(liveProps);
    expect(result.current.selectedMonth).toBeNull();
  });

  it("fetches and sets historical data for a selected month", async () => {
    mockGetBasketDataForMonth.mockResolvedValue(historicalProps);

    const { result } = renderHook(() => useHistoricalBasket(liveProps));

    await act(async () => {
      await result.current.handleMonthSelect("2024-01");
    });

    expect(mockGetBasketDataForMonth).toHaveBeenCalledWith("2024-01");
    expect(result.current.selectedMonth).toBe("2024-01");
    expect(result.current.activeData).toEqual(historicalProps);
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it("falls back to liveProps when API returns null", async () => {
    mockGetBasketDataForMonth.mockResolvedValue(null);

    const { result } = renderHook(() => useHistoricalBasket(liveProps));

    await act(async () => {
      await result.current.handleMonthSelect("2024-01");
    });

    expect(result.current.activeData).toBe(liveProps);
  });

  it("sets isLoadingHistory to true while fetching, false after", async () => {
    let resolvePromise!: (v: BasketSummaryProps) => void;
    mockGetBasketDataForMonth.mockReturnValue(
      new Promise<BasketSummaryProps>((res) => { resolvePromise = res; }),
    );

    const { result } = renderHook(() => useHistoricalBasket(liveProps));

    act(() => {
      result.current.handleMonthSelect("2024-01");
    });

    expect(result.current.isLoadingHistory).toBe(true);

    await act(async () => {
      resolvePromise(historicalProps);
    });

    expect(result.current.isLoadingHistory).toBe(false);
  });
});
