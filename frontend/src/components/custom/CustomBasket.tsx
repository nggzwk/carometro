"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BasketItemData } from "../../lib/basketTypes";
import { inViewMotionProps } from "../../lib/motionPresets";
import ItemsCircle from "./ItemsCircle";
import Cart from "./Cart";
import TotalCart from "./TotalCart";
import MenuSwitcher from "./MenuSwitcher";
import OverLimitToast from "./OverLimitToast";
import { useCustomBasket } from "./useCustomBasket";
import { itemDisplayName, menuItemIcon } from "./helpers";
import { RING_RADIUS } from "./constants";
import type { Menu } from "./types";

interface CustomBasketProps {
  basicaoItems: BasketItemData[];
  feiraoItems: BasketItemData[];
}

export default function CustomBasket({
  basicaoItems,
  feiraoItems,
}: CustomBasketProps) {
  const [menu, setMenu] = useState<Menu>("basicao");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { lines, count, total, overLimit, popTick, addItem, removeItem, clearCart } =
    useCustomBasket();

  const items = menu === "basicao" ? basicaoItems : feiraoItems;
  const latestMonthRef = basicaoItems[0]?.month_ref ?? feiraoItems[0]?.month_ref ?? null;
  const monthLabel = latestMonthRef
    ? new Date(latestMonthRef + "-02")
        .toLocaleString("pt-BR", { month: "long"})
    : "mês atual";
  const toggleMenu = () =>
    setMenu((m) => (m === "basicao" ? "feirao" : "basicao"));
  const toggleCart = () => setIsCartOpen((o) => !o);

  const positions = useMemo(
    () =>
      items.map((_, i) => {
        const angle =
          (-90 + (360 * i) / Math.max(items.length, 1)) * (Math.PI / 180);
        return {
          left: 50 + RING_RADIUS * Math.cos(angle),
          top: 50 + RING_RADIUS * Math.sin(angle),
        };
      }),
    [items],
  );

  return (
    <motion.div
      {...inViewMotionProps}
      className="w-full flex flex-col items-center text-center gap-6"
    >
      <div className="flex flex-col items-center gap-1">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.20em]"
          style={{ color: "#a89b8c", fontFamily: "var(--font-card-summary)" }}
        >
          Preços de {monthLabel}
        </p>
        <h2
          className="text-4xl font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-subheader)",
            color: "#1A120B",
            letterSpacing: "-0.01em",
          }}
        >
          Monte sua Cesta
        </h2>
      </div>

      <MenuSwitcher menu={menu} onToggle={toggleMenu} />

      <div
        className="relative"
        style={{ width: "clamp(300px, 82vw, 440px)", aspectRatio: "1 / 1" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={menu}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {items.map((item, i) => {
              const icon = menuItemIcon(menu, item.produto_subcategoria);
              return (
                <div
                  key={item.produto_subcategoria}
                  className="absolute"
                  style={{
                    left: `${positions[i].left}%`,
                    top: `${positions[i].top}%`,
                    width: "clamp(46px, 14%, 60px)",
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <ItemsCircle
                    icon={icon}
                    label={itemDisplayName(item)}
                    delay={i * 0.025}
                    onClick={() => addItem(item, icon)}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <OverLimitToast show={overLimit} />

        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "clamp(90px, 26%, 112px)",
            aspectRatio: "1 / 1",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Cart count={count} popTick={popTick} onClick={toggleCart} />
        </div>
      </div>

      <div className="w-full">
        <TotalCart
          lines={lines}
          count={count}
          total={total}
          isOpen={isCartOpen}
          onToggle={toggleCart}
          onRemove={removeItem}
          onClear={clearCart}
        />
      </div>
    </motion.div>
  );
}
