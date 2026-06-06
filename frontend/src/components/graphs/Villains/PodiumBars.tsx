"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getBasketItemIcon } from "../../../lib/basketIcons";
import { getVeggieItemIcon } from "../../../lib/veggieBasket";
import { formatPct, shortName } from "../../../lib/formatters";

const MAX_BAR_HEIGHT = 320;
const BAR_GROW_DURATION = 1.1;

function getDisplayName(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("coxão") || lower.includes("coxao")) return "CARNE";
  if (lower.includes("filé") || lower.includes("file")) return "FRANGO";
  return shortName(name);
}

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
  // Basicão
  if (lower.includes("ovo")) return ["#fff5beb6", "#F59E0B"];
  if (lower.includes("óleo") || lower.includes("oleo"))
    return ["#8db6cf4d", "#5e8097"];
  if (lower.includes("trigo") || lower.includes("farinha"))
    return ["#ffbb0051", "#D97706"];
  if (lower.includes("café") || lower.includes("cafe"))
    return ["#8d340045", "#78350F"];
  if (lower.includes("açúcar") || lower.includes("acucar"))
    return ["#fb11ff15", "#fb11ff"];
  if (lower.includes("leite")) return ["#85664019", "#866c4d"];
  if (lower.includes("arroz")) return ["#c6c18131", "#8f8b61"];
  if (lower.includes("feijão") || lower.includes("feijao"))
    return ["#9c3d1b41", "#683b2a"];
  if (lower.includes("carne") || lower.includes("coxão"))
    return ["#e11d471b", "#E11D48"];
  if (lower.includes("frango")) return ["#ffa42440", "#D97706"];

  // Feirão
  if (lower.includes("tomate")) return ["#ffe9e9", "#dc2f26"];
  if (lower.includes("banana")) return ["#fffac6a4", "#cea100"];
  if (lower.includes("cebola")) return ["#ffae004a", "#CA8A04"];
  if (lower.includes("alface")) return ["#F0FDF4", "#16A34A"];
  if (lower.includes("cenoura")) return ["#ff4d004e", "#EA580C"];
  if (lower.includes("laranja")) return ["#ff8b0e68", "#ff8000"];
  if (lower.includes("maçã") || lower.includes("maca"))
    return ["#ff8cbc64", "#b4004b"];
  if (lower.includes("abóbora") || lower.includes("abobora"))
    return ["#9b24004d", "#743826"];
  if (lower.includes("batata")) return ["#FEF3C7", "#D97706"];
  return ["#F9FAFB", "#6B7280"];
}

export default function PodiumBars({ displayItems }: { displayItems: any[] }) {
  const podiumItems =
    displayItems.length === 3
      ? [displayItems[1], displayItems[0], displayItems[2]]
      : displayItems.length === 2
        ? [displayItems[1], displayItems[0]]
        : displayItems;

  return (
    <div className="flex items-end justify-center w-full relative mb-10 gap- px-2">
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
  const rankIndex = displayItems.indexOf(item);

  const heights = [
    MAX_BAR_HEIGHT,
    MAX_BAR_HEIGHT * 0.82,
    MAX_BAR_HEIGHT * 0.62,
  ];
  const calculatedHeight = heights[rankIndex] ?? MAX_BAR_HEIGHT * 0.62;

  const [barColor, accentColor] = getBarTheme(nameValue);

  const lineRef = useRef<HTMLDivElement | null>(null);
  const isLineVisible = useInView(lineRef, { amount: 1, once: false });

  const entryDelay = rankIndex === 0 ? 0.1 : rankIndex === 1 ? 0.0 : 0.2;

  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      className="flex flex-col items-center relative group"
      style={{ width: 80 }}
    >
      <motion.div
        variants={{
          rest: { opacity: 0, y: 6, scale: 0.95 },
          hover: { opacity: 1, y: 0, scale: 1 },
        }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden sm:block"
      >
        <div
          className="whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{
            fontFamily: "var(--font-card-summary)",
            color: accentColor,
            backgroundColor: "rgba(255,255,255,0.45)",
            border: `1px solid rgba(255,255,255,0.75)`,
            borderRadius: "6px",
            boxShadow: `0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {formatPct(pctValue)}
        </div>
      </motion.div>

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

      <motion.div
        initial={{ opacity: 0 }}
        animate={isLineVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay + 0.05 : 0,
          duration: 0.4,
        }}
        className="mb-2 text-[10px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 sm:hidden"
        style={{
          fontFamily: "var(--font-card-summary)",
          color: accentColor,
          backgroundColor: "rgba(255,255,255,0.45)",
          border: `1px solid rgba(255,255,255,0.75)`,
          borderRadius: "6px",
          boxShadow: `0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {formatPct(pctValue)}
      </motion.div>

      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isLineVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
        }
        transition={{
          delay: isLineVisible ? BAR_GROW_DURATION + entryDelay - 0.08 : 0,
          duration: 0.35,
          type: "spring",
          stiffness: 200,
        }}
        className="text-6xl select-none leading-none mb-0 drop-shadow-sm"
      >
        {item.produto_subcategoria >= 50000 && item.produto_subcategoria < 51000
          ? getVeggieItemIcon(item.produto_subcategoria)
          : item.produto_subcategoria
            ? getBasketItemIcon(item.produto_subcategoria)
            : getFallbackIcon(nameValue)}
      </motion.span>

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
          width: "85%",
          backgroundColor: barColor,
          borderTop: `2px solid ${accentColor}`,
          transformOrigin: "bottom",
          borderRadius: "6px 6px 2px 2px",
          boxShadow: `0 -2px 12px 0 ${accentColor}20`,
          position: "relative",
          overflow: "hidden",
        }}
      ></motion.div>

      <div
        ref={lineRef}
        style={{
          width: "100%",
          height: 1,
          backgroundColor: "#D1C9BE",
        }}
      />

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
        {getDisplayName(nameValue)}
      </motion.p>
    </motion.div>
  );
}
