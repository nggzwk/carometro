import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomBasket } from "../../src/components/custom/useCustomBasket";
import type { BasketItemData } from "../../src/lib/basketTypes";

vi.mock("../../src/components/custom/helpers", () => ({
  itemDisplayName: (item: BasketItemData) => item.item_name ?? "ITEM",
}));

vi.mock("../../src/lib/basketIcons", () => ({
  getQtdEmbalagemSigla: () => "KG",
}));

function makeItem(subcat: number, price = "10.00"): BasketItemData {
  return {
    produto_categoria: 1,
    produto_subcategoria: subcat,
    item_name: `Item ${subcat}`,
    qtd_embalagem: "1KG",
    month_ref: "2024-01",
    month_price: price,
    previous_price: "9.00",
    mom_pct: 11.11,
    ipca_monthly_pct: 0.5,
  };
}

describe("useCustomBasket", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with an empty cart", () => {
    const { result } = renderHook(() => useCustomBasket());
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("adds a new item and increments count", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
    });

    expect(result.current.count).toBe(1);
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].subcat).toBe(40003);
  });

  it("increments qty when adding the same item twice", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
      result.current.addItem(makeItem(40003), "🍚");
    });

    expect(result.current.count).toBe(2);
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].qty).toBe(2);
  });

  it("calculates subtotal per line", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003, "5.00"), "🍚");
      result.current.addItem(makeItem(40003, "5.00"), "🍚");
    });

    expect(result.current.lines[0].subtotal).toBe(10);
    expect(result.current.total).toBe(10);
  });

  it("removes one unit when removeItem is called", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
      result.current.addItem(makeItem(40003), "🍚");
    });

    act(() => {
      result.current.removeItem(40003);
    });

    expect(result.current.count).toBe(1);
    expect(result.current.lines[0].qty).toBe(1);
  });

  it("removes the line entirely when qty reaches zero", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
    });

    act(() => {
      result.current.removeItem(40003);
    });

    expect(result.current.lines).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });

  it("clearCart empties all lines", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
      result.current.addItem(makeItem(40012), "🫘");
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.lines).toHaveLength(0);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("increments popTick each time an item is added", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
    });

    expect(result.current.popTick).toBe(1);

    act(() => {
      result.current.addItem(makeItem(40012), "🫘");
    });

    expect(result.current.popTick).toBe(2);
  });

  it("sets overLimit when count reaches ITEM_LIMIT (300) and clears it after timeout", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      for (let i = 1; i <= 300; i++) {
        result.current.addItem(makeItem(i), "🛒");
      }
    });

    expect(result.current.count).toBe(300);

    act(() => {
      result.current.addItem(makeItem(999), "🛒");
    });

    expect(result.current.overLimit).toBe(true);

    // After the timeout it clears
    act(() => {
      vi.advanceTimersByTime(5001);
    });

    expect(result.current.overLimit).toBe(false);
  });

  it("persists the cart to localStorage after adding items", () => {
    const { result } = renderHook(() => useCustomBasket());

    act(() => {
      result.current.addItem(makeItem(40003), "🍚");
    });

    const stored = JSON.parse(localStorage.getItem("carometro_basket") ?? "{}");
    expect(stored[40003]).toBeDefined();
    expect(stored[40003].qty).toBe(1);
  });

  it("hydrates from localStorage on mount", () => {
    localStorage.setItem(
      "carometro_basket",
      JSON.stringify({
        40003: {
          item: makeItem(40003),
          icon: "🍚",
          qty: 3,
          insertOrder: 0,
        },
      }),
    );

    const { result } = renderHook(() => useCustomBasket());

    act(() => {});

    expect(result.current.count).toBe(3);
  });
});
