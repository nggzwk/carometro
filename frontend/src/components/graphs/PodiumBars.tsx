"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getBasketItemIcon } from "../../lib/basketIcons";
import { formatPct, shortName } from "../../lib/formatters";

const MAX_BAR_HEIGHT = 260;
const BAR_GROW_DURATION = 1.1;

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

// Returns [barColor, accentColor] per item
function getBarTheme(name: string): [string, string] {
  const lower = name.toLowerCase();
  if (lower.includes("ovo")) return ["#FEF3C7", "#F59E0B"];
  if (lower.includes("óleo") || lower.includes("oleo"))
    return ["#FEF9C3", "#CA8A04"];
  if (lower.includes("trigo") || lower.includes("farinha"))
    return ["#FEF3C7", "#D97706"];
  if (lower.includes("café") || lower.includes("cafe"))
    return ["#EDE0D4", "#78350F"];
  if (lower.includes("açúcar") || lower.includes("acucar"))
    return ["#ECFDF5", "#059669"];
  if (lower.includes("leite")) return ["#F5F3FF", "#7C3AED"];
  if (lower.includes("arroz")) return ["#FFF7ED", "#EA580C"];
  if (lower.includes("feijão") || lower.includes("feijao"))
    return ["#F0FDF4", "#16A34A"];
  if (lower.includes("carne") || lower.includes("coxão"))
    return ["#FFF1F2", "#E11D48"];
  if (lower.includes("frango")) return ["#FFFBEB", "#D97706"];
  return ["#F9FAFB", "#6B7280"];
}

export default function PodiumBars({ displayItems }: { displayItems: any[] }) {
  // Reorder: 2nd, 1st, 3rd for podium visual
  const podiumItems =
    displayItems.length === 3
      ? [displayItems[1], displayItems[0], displayItems[2]]
      : displayItems;

  return (
    <div className="flex items-end justify-center w-full relative mb-10 gap-3 px-2">
      {podiumItems.map((item, index) => (
        <PodiumBarItem
          key={`${item.item_name ?? "item"}-${index}`}
          item={item}
          index={index}
          displayItems={displayItems}
        />
      ))}
    </div>
  );
}

function PodiumBarItem({
  item,
  index,
  displayItems,
}: {
  item: any;
  index: number;
  displayItems: any[];
}) {
  const pctValue = item.mom_pct ?? 0;
  const nameValue = item.item_name ?? "";
  const rankIndex = displayItems.indexOf(item); // 0 = highest inflation

  const heights = [
    MAX_BAR_HEIGHT,
    MAX_BAR_HEIGHT * 0.82,
    MAX_BAR_HEIGHT * 0.62,
  ];
  const calculatedHeight = heights[rankIndex] ?? MAX_BAR_HEIGHT * 0.62;

  const [barColor, accentColor] = getBarTheme(nameValue);
  const isPositive = pctValue >= 0;

  const lineRef = useRef<HTMLDivElement | null>(null);
  const isLineVisible = useInView(lineRef, { amount: 1, once: false });

  // Staggered entry delay per bar
  const entryDelay = rankIndex === 0 ? 0.1 : rankIndex === 1 ? 0.0 : 0.2;

  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      className="flex flex-col items-center relative group"
      style={{ width: 80 }}
    >
      {/* Tooltip on hover */}
      <motion.div
        variants={{
          rest: { opacity: 0, y: 10, scale: 0.92 },
          hover: { opacity: 1, y: 0, scale: 1 },
        }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      >
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap"
          style={{
            fontFamily: "var(--font-card-summary)",
            backgroundColor: accentColor,
            color: "#fff",
            letterSpacing: "0.04em",
          }}
        >
          {shortName(nameValue)} {formatPct(pctValue)}
        </div>
        {/* Tooltip arrow */}
        <div
          className="w-2 h-2 rotate-45 mx-auto -mt-1"
          style={{ backgroundColor: accentColor }}
        />
      </motion.div>

      {/* Rank badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isLineVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay + 0.15 : 0,
          duration: 0.3,
          type: "spring",
          stiffness: 260,
        }}
        className="text-base mb-1 select-none"
      ></motion.div>

      {/* Percentage label on bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isLineVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay + 0.05 : 0,
          duration: 0.4,
        }}
        className="mb-2 text-xs font-bold tracking-wide"
        style={{ color: accentColor, fontFamily: "var(--font-card-summary)" }}
      >
        {formatPct(pctValue)}
      </motion.div>

      {/* Emoji icon */}
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isLineVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
        }
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay : 0,
          duration: 0.35,
          type: "spring",
          stiffness: 200,
        }}
        className="text-6xl select-none leading-none mb-2 drop-shadow-sm"
      >
        {item.produto_subcategoria
          ? getBasketItemIcon(item.produto_subcategoria)
          : getFallbackIcon(nameValue)}
      </motion.span>

      {/* The bar itself */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={isLineVisible ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{
          delay: entryDelay,
          duration: BAR_GROW_DURATION,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          height: calculatedHeight,
          width: "100%",
          backgroundColor: barColor,
          borderTop: `3px solid ${accentColor}`,
          transformOrigin: "bottom",
          borderRadius: "6px 6px 2px 2px",
          boxShadow: `0 -2px 12px 0 ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.6)`,
          position: "relative",
          overflow: "hidden",
        }}
      ></motion.div>

      {/* Bottom line */}
      <div
        ref={lineRef}
        style={{
          width: "100%",
          height: 1,
          backgroundColor: "#D1C9BE",
        }}
      />

      {/* Item name label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={isLineVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay + 0.2 : 0,
          duration: 0.4,
        }}
        className="mt-2 text-center text-[10px] leading-tight font-medium uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-subheader)",
          color: "#6B5E52",
          maxWidth: 72,
        }}
      >
        {shortName(nameValue)}
      </motion.p>
    </motion.div>
  );
}
