"use client";

import { useRef } from "react";

import { motion, useInView } from "framer-motion";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { formatPct, shortName } from "../../lib/formatters";

const MAX_BAR_HEIGHT = 280;
const BAR_GROW_DURATION = 0.85;

function getFallbackIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ovo")) return "🍳";
  if (lower.includes("óleo") || lower.includes("oleo")) return "🫙";
  if (lower.includes("trigo") || lower.includes("farinha")) return "🍞";
  if (lower.includes("café") || lower.includes("cafe")) return "☕";
  if (lower.includes("açúcar") || lower.includes("acucar")) return "🍬";
  if (lower.includes("leite")) return "🥛";
  if (lower.includes("arroz")) return "🍚";
  if (lower.includes("feijão") || lower.includes("feijao")) return "🫘";
  if (lower.includes("carne") || lower.includes("coxão")) return "🥩";
  if (lower.includes("frango")) return "🍗";
  return "🛒";
}

export default function PodiumBars({ displayItems }: { displayItems: any[] }) {
  const podiumItems =
    displayItems.length === 3
      ? [displayItems[1], displayItems[0], displayItems[2]]
      : displayItems;
  const barWidthClass = "w-[44px]";

  return (
    <div className="flex items-end justify-center w-full relative mb-14 gap-0">
      {podiumItems.map((item, index) => (
        <PodiumBarItem
          key={`${item.item_name ?? "item"}-${index}`}
          item={item}
          index={index}
          displayItems={displayItems}
          barWidthClass={barWidthClass}
        />
      ))}
    </div>
  );
}

function PodiumBarItem({
  item,
  index,
  displayItems,
  barWidthClass
}: {
  item: any;
  index: number;
  displayItems: any[];
  barWidthClass: string;
}) {
  const pctValue = item.mom_pct ?? 0;
  const nameValue = item.item_name ?? "";

  const rankIndex = displayItems.indexOf(item);

  const calculatedHeight =
    rankIndex === 0
      ? MAX_BAR_HEIGHT
      : rankIndex === 1
        ? MAX_BAR_HEIGHT * 0.88
        : MAX_BAR_HEIGHT * 0.66;

  const barColor = getBarColorByItemName(nameValue);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const isLineVisible = useInView(lineRef, { amount: 1, once: false });

  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={`flex flex-col items-center ${barWidthClass} relative group`}
    >
      <motion.div
        variants={{
          rest: { opacity: 0, y: 6, scale: 0.98 },
          hover: { opacity: 1, y: 0, scale: 1 }
        }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="subtitle absolute -top-6 bg-[#e9e0d6]/90 text-[10px] py-1 px-2 rounded-lg z-10 pointer-events-none whitespace-nowrap items-center flex justify-center font-bold"
      >
        {shortName(nameValue)} {formatPct(pctValue)}
      </motion.div>

      <motion.span
        initial={{ scale: 0, opacity: 0, y: 8 }}
        animate={
          isLineVisible
            ? { scale: 1, opacity: 1, y: 0 }
            : { scale: 0, opacity: 0, y: 8 }
        }
        transition={{ delay: isLineVisible ? BAR_GROW_DURATION + 0.05 : 0, duration: 0.28 }}
        className="text-4xl select-none leading-none -mb-[2px] filter drop-shadow-[1px_1px_0px_rgba(0,0,0,0.12)] transform transition-transform group-hover:scale-110 duration-200"
      >
        {item.produto_subcategoria
          ? getBasketItemIcon(item.produto_subcategoria)
          : getFallbackIcon(nameValue)}
      </motion.span>

      <motion.div
        initial={{ scaleY: 0 }}
        animate={isLineVisible ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{
          duration: BAR_GROW_DURATION,
          ease: [0.25, 1, 0.5, 1]
        }}
        style={{ height: calculatedHeight, backgroundColor: barColor }}
        className={`${barWidthClass} border-0.5 border-black rounded-sm origin-bottom`}
      />

      <div className="flex h-px items-end">
        <div
          ref={lineRef}
          aria-hidden="true"
          className={`${barWidthClass} h-[0.5px] bg-black`}
        />
      </div>
    </motion.div>
  );
}

function getBarColorByItemName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ovo")) return "#fff49f";
  if (lower.includes("óleo") || lower.includes("oleo")) return "#ffe49f";
  if (lower.includes("trigo") || lower.includes("farinha")) return "#f2bd78";
  if (lower.includes("café") || lower.includes("cafe")) return "#ae9a8b";
  if (lower.includes("açúcar") || lower.includes("acucar")) return "#b1f3ec";
  if (lower.includes("leite")) return "#ebdbdb";
  if (lower.includes("arroz")) return "#e5caa2";
  if (lower.includes("feijão") || lower.includes("feijao")) return "#b6c89e";
  if (lower.includes("carne") || lower.includes("coxão")) return "#e1aeae";
  if (lower.includes("frango")) return "#ffdba6";
  return "#d1d5db";
}