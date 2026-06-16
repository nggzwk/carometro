import { useEffect, useMemo, useRef, useState } from "react";
import type { BasketItemData } from "../../lib/basketTypes";
import { getQtdEmbalagemSigla } from "../../lib/basketIcons";
import { ITEM_LIMIT, OVER_LIMIT_DURATION_MS } from "./constants";
import { itemDisplayName, itemFullName } from "./helpers";
import type { CartEntry, CartLine } from "./types";

const STORAGE_KEY = "carometro_basket";

function loadCart(): Record<number, CartEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<number, CartEntry>;
  } catch {
    return {};
  }
}

function saveCart(cart: Record<number, CartEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    return;
  }
}

export interface CustomBasketState {
  lines: CartLine[];
  count: number;
  total: number;
  overLimit: boolean;
  popTick: number;
  addItem: (item: BasketItemData, icon: string) => void;
  removeItem: (subcat: number) => void;
  clearCart: () => void;
}

export function useCustomBasket(): CustomBasketState {
  const [cart, setCart] = useState<Record<number, CartEntry>>({});
  const [hydrated, setHydrated] = useState(false);
  const [overLimit, setOverLimit] = useState(false);
  const [popTick, setPopTick] = useState(0);
  const insertCounterRef = useRef(0);
  const overLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveCart(cart);
  }, [cart, hydrated]);

  useEffect(
    () => () => {
      if (overLimitTimerRef.current) clearTimeout(overLimitTimerRef.current);
    },
    [],
  );

  const { lines, count, total } = useMemo(() => {
    const computed: CartLine[] = Object.values(cart)
      .map(({ item, icon, qty, insertOrder }) => {
        const price = parseFloat(item.month_price) || 0;
        const name = itemDisplayName(item);
        return {
          subcat: item.produto_subcategoria,
          name,
          fullName: itemFullName(item),
          sigla: getQtdEmbalagemSigla(
            item.qtd_embalagem,
            item.produto_subcategoria,
          ),
          icon,
          qty,
          price,
          subtotal: price * qty,
          insertOrder,
        };
      })
      .sort((a, b) => b.insertOrder - a.insertOrder);

    return {
      lines: computed,
      count: computed.reduce((sum, l) => sum + l.qty, 0),
      total: computed.reduce((sum, l) => sum + l.subtotal, 0),
    };
  }, [cart]);

  const addItem = (item: BasketItemData, icon: string) => {
    if (count >= ITEM_LIMIT) {
      setOverLimit(true);
      if (overLimitTimerRef.current) clearTimeout(overLimitTimerRef.current);
      overLimitTimerRef.current = setTimeout(
        () => setOverLimit(false),
        OVER_LIMIT_DURATION_MS,
      );
      return;
    }

    const subcat = item.produto_subcategoria;
    const isNew = !cart[subcat];
    setCart((prev) => ({
      ...prev,
      [subcat]: {
        item,
        icon,
        qty: (prev[subcat]?.qty ?? 0) + 1,
        insertOrder: isNew
          ? insertCounterRef.current
          : (prev[subcat]?.insertOrder ?? 0),
      },
    }));
    insertCounterRef.current += 1;
    setPopTick((t) => t + 1);
  };

  const removeItem = (subcat: number) => {
    setCart((prev) => {
      const entry = prev[subcat];
      if (!entry) return prev;
      const next = { ...prev };
      if (entry.qty <= 1) delete next[subcat];
      else next[subcat] = { ...entry, qty: entry.qty - 1 };
      return next;
    });
  };

  const clearCart = () => setCart({});

  return {
    lines,
    count,
    total,
    overLimit,
    popTick,
    addItem,
    removeItem,
    clearCart,
  };
}
