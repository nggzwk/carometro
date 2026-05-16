import React from "react";
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

  const isInflation = (mom_pct ?? 0) >= 0;

  const themeColor = isInflation
    ? "border-[var(--color-inflation)]"
    : "border-[var(--color-deflation)]";
  const statusBgColor = isInflation
    ? "rgba(230, 57, 70, 0.82)"
    : "rgba(42, 157, 143, 0.82)";
  const arrowColor = isInflation
    ? "text-[var(--color-inflation)]"
    : "text-[var(--color-deflation)]";
  const arrowDirection = isInflation ? "▲" : "▼";
  const arrowMotionClass = isInflation
    ? "arrow-blink-inflation"
    : "arrow-bounce-down";

  // Calcula a diferença absoluta em R$
  const deltaBrl = previous_price
    ? parseFloat(month_price) - parseFloat(previous_price)
    : 0;

  return (
    <div
      className={`flex flex-col bg-brand border-4 ${themeColor} rounded-[3px] overflow-hidden h-full min-h-[84px] lg:min-h-[116px]`}
    >
      <div className="relative flex-1 flex items-end justify-center gap-2 px-2 pt-3 pb-0 lg:px-4 lg:pt-5 lg:pb-0 text-center">
        <span className="text-lg lg:text-2xl select-none mb-0.5">
          {getBasketItemIcon(produto_subcategoria)}
        </span>

        <h3
          className="font-sans font-black text-2xl lg:text-[34px] tracking-wide text-black select-none leading-none"
          style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
        >
          {shortName(item_name)}
        </h3>

        <span
          className={`text-lg font-bold ${arrowColor} ${arrowMotionClass} select-none mb-0.5`}
        >
          {arrowDirection}
        </span>
      </div>

      <div
        className="w-full text-white px-2.5 py-1.5 lg:px-4 lg:py-2.5 flex justify-between items-center border-t border-white"
        style={{ backgroundColor: statusBgColor }}
      >
        <span className="font-mono text-[16px] lg:text-[19px] font-bold tracking-tight">
          {formatPct(mom_pct, true)}
        </span>
        <span className="font-mono text-[16px] lg:text-[19px] font-bold tracking-tight">
          {formatBrl(deltaBrl)}
        </span>
      </div>
    </div>
  );
};
