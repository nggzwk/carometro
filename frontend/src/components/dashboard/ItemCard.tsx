"use client";

import React, { useEffect, useRef, useState } from "react";
import type { BasketItemData } from "../../lib/basketTypes";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { formatBrl, formatPct, shortName } from "../../lib/formatters";

interface ItemCardProps {
  item: BasketItemData;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
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
  const statusBgColor = isInflation
    ? "rgba(230, 57, 70, 0.82)"
    : "rgba(42, 157, 143, 0.82)";
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
          if (entry.isIntersecting) {
            setArrowVisible(true);
          } else {
            setArrowVisible(false);
          }
        });
      },
      { threshold: 0.5 }
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
    <div
      className={`flex flex-col bg-brand border-3 ${themeColor} rounded-[3px] overflow-hidden h-full min-h-[84px] lg:min-h-[116px]`}
    >
      <div className="relative flex-1 flex items-center justify-between gap-2 px-2 pt-3 pb-0 lg:px-4 lg:pt-5 lg:pb-0">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-lg lg:text-2xl select-none">
            {getBasketItemIcon(produto_subcategoria)}
          </span>

          <h3
            className="subheader font-black text-3xl lg:text-[34px] tracking-wide text-black select-none leading-none text-center"
            style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
          >
            {displayName}
          </h3>
        </div>

        <span
          ref={arrowRef}
          className={`flex-none text-lg font-bold ${arrowColor} ${arrowVisible ? arrowMotionClass : ""} select-none`}
        >
          {arrowDirection}
        </span>
      </div>

      <div
        className="w-full text-white px-2 md:px-1.5 lg:px-2.5 py-1.5 flex justify-between items-end border-t border-white"
        style={{ backgroundColor: statusBgColor }}
      >
        <span
          className="footer text-sm tracking-tighter leading-none self-end"
          style={{ WebkitTextStroke: "0.8px black", color: "#fff8eb" }}
        >
          {formatPct(mom_pct, true)}
        </span>
        <span
          className="footer text-sm tracking-tight leading-none self-end"
          style={{ WebkitTextStroke: "0.8px black", color: "#fff8eb" }}>
          {formatBrl(deltaBrl)}
        </span>
      </div>
    </div>
  );
};
