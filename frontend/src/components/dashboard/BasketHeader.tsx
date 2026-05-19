"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { formatBrl, formatPct } from "../../lib/formatters";

interface BasketHeaderProps {
  totalInflationPct: number | null;
  totalValue: number;
  annualIpca?: number | null;
  monthlyIpca?: number | null;
}

export const BasketHeader: React.FC<BasketHeaderProps> = ({
  totalInflationPct,
  totalValue,
  annualIpca,
  monthlyIpca,
}) => {
  const pct = totalInflationPct ?? 0;
  const [isPinned, setIsPinned] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const showTotalValue = isPinned;
  const exceedsBenchmark =
    (annualIpca != null && pct > annualIpca) ||
    (monthlyIpca != null && pct > monthlyIpca);
  const totalValueStroke = exceedsBenchmark ? "#E63946" : "#2A9D8F";
  const totalValueEmoji =
    pct > 15
      ? " ☠️"
      : pct > 10
        ? " 😭"
        : pct > 5
          ? " 😱"
          : pct < 4
            ? " 😐"
            : " 💰";
  const displayText = showTotalValue
    ? `${formatBrl(totalValue)}${totalValueEmoji}`
    : pct >= 0.1
      ? `AUMENTOU ${formatPct(pct, true)}`
      : `DIMINUIU ${formatPct(Math.abs(pct), true)}`;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const isMobile = mediaQuery.matches;

    if (!isMobile) return;

    const interval = setInterval(() => {
      setIsPinned((prev) => !prev);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTooltipStart = () => {
    setShowTooltip(true);

    if (tooltipTimeoutRef.current != null) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
      tooltipTimeoutRef.current = null;
    }, 3000);
  };

  const handleTooltipEnd = () => {
    if (tooltipTimeoutRef.current != null) {
      window.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    setShowTooltip(false);
  };

  return (
    <div className="w-fit mx-auto py-1.5 px-5 text-center bg-background-color select-none">
      <div className="flex items-center gap-3 justify-center tracking-tightest">
        <motion.div
          initial="rest"
          animate={showTooltip ? "hover" : "rest"}
          onHoverStart={handleTooltipStart}
          onHoverEnd={handleTooltipEnd}
          className="relative"
        >
          <motion.div
            variants={{
              rest: { opacity: 0, y: 6, scale: 0.98 },
              hover: { opacity: 1, y: 0, scale: 1 }
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="subtitle absolute -top-8 left-1/2 -translate-x-1/2 bg-[#e9e0d6]/50 text-[10px] py-1 px-2 rounded-lg z-10 pointer-events-none whitespace-nowrap flex justify-center"
          >
            CLIQUE
          </motion.div>
          <motion.button
            type="button"
            onClick={() => setIsPinned((prev) => !prev)}
            whileTap={{ scale: 0.98 }}
            className="summary text-xl tracking-widest text-white whitespace-nowrap leading-none"
            style={{
              WebkitTextStroke: showTotalValue ? `1.2px ${totalValueStroke}` : "1px black",
              color: "#ffffff",
            }}
            aria-pressed={isPinned}
          >
            {displayText}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default BasketHeader;
