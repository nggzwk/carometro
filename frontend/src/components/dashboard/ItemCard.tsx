"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { BasketItemData } from "../../lib/basketTypes";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { formatBrl, formatPct, shortName } from "../../lib/formatters";

interface ItemCardProps {
  item: BasketItemData;
  index?: number;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, index = 0 }) => {
  const {
    item_name,
    mom_pct,
    month_price,
    previous_price,
    produto_subcategoria,
  } = item;

  const isInflation = (mom_pct ?? 0) > 0;

  const themeColor = isInflation
    ? "border-[var(--color-inflation)]"
    : "border-[var(--color-deflation)]";
  // const statusBgColor = isInflation
  //   ? "rgba(255, 255, 255, 0.88)"
  //   : "rgba(42, 157, 143, 0.88)";
  const arrowColor = isInflation
    ? "text-[var(--color-inflation)]"
    : "text-[var(--color-deflation)]";
  const arrowDirection = mom_pct === 0 ? "=" : isInflation ? "▲" : "▼";
  const arrowMotionClass =
    mom_pct === 0
      ? ""
      : isInflation
        ? "arrow-blink-inflation"
        : "arrow-bounce-down";

  const arrowRef = useRef<HTMLSpanElement | null>(null);
  const [arrowVisible, setArrowVisible] = useState(false);

  useEffect(() => {
    const el = arrowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setArrowVisible(true);
          else setArrowVisible(false);
        });
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const deltaBrl = previous_price
    ? parseFloat(month_price) - parseFloat(previous_price)
    : 0;

  const displayName = (() => {
    const name = (item_name || "").toLowerCase();
    if (name.includes("coxão")) return "CARNE";
    if (name.includes("filé")) return "FRANGO";
    return shortName(item_name);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.55,
        delay: (index % 5) * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.2 } }}
      className={`flex flex-col bg-brand border-2 ${themeColor} rounded-2xl overflow-hidden h-full min-h-[84px] lg:min-h-[116px] cursor-default`}
      style={{
        boxShadow: isInflation
          ? "0 2px 12px rgba(230,57,70,0.10)"
          : "0 2px 12px rgba(42,157,143,0.10)",
      }}
    >
      {/* Top section */}
      <div className="relative flex-1 flex items-center justify-between gap-2 px-2.5 pt-3 pb-0 lg:px-4 lg:pt-5 lg:pb-0">
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <span className="text-lg lg:text-2xl select-none">
            {getBasketItemIcon(produto_subcategoria)}
          </span>

          <h3
            className="text-2xl sm:text-4xl tracking-tight"
            style={{
              fontFamily: "var(--font-header)",
              color: "#000000",
              fontWeight: 30,
              letterSpacing: "0.05em",
            }}
          >
            {displayName}
          </h3>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div
        className="w-full text-white px-2.5 md:px-2 lg:px-3 py-1.5 flex justify-between items-end mt-1"
        // style={{ backgroundColor: statusBgColor }}
      >
        <span
          className="text-[15px] font-semibold tracking-tight leading-none self-end tabular-nums"
          style={{
            fontFamily: "var(--font-card-summary)",
            color: "#000000",
          }}
        >
          {formatPct(mom_pct, true)}
        </span>
        <span
          ref={arrowRef}
          className={`flex-none text-base font-bold ${arrowColor} ${arrowVisible ? arrowMotionClass : ""} select-none align-bottom self-end`}
        >
          {arrowDirection}
        </span>
        <span
          className="text-[15px] font-semibold tracking-tight leading-none self-end tabular-nums"
          style={{
            fontFamily: "var(--font-card-summary)",
            color: "#000000",
          }}
        >
          {formatBrl(deltaBrl)}
        </span>
      </div>
    </motion.div>
  );
};
