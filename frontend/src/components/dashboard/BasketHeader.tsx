"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const exceedsBenchmark =
    (annualIpca != null && pct > annualIpca) ||
    (monthlyIpca != null && pct > monthlyIpca);

  const accentColor = exceedsBenchmark ? "#E63946" : "#2A9D8F";

  const totalValueEmoji =
    pct > 15 ? "☠️" : pct > 10 ? "😭" : pct > 5 ? "😱" : pct < 4 ? "😐" : "💰";

  const showTotalValue = isPinned;
  const label = showTotalValue
    ? `${formatBrl(totalValue)} ${totalValueEmoji}`
    : pct >= 0.1
      ? `Aumentou ${formatPct(pct, true)}`
      : `Diminuiu -${formatPct(Math.abs(pct), false)}`;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    if (!mediaQuery.matches) return;
    const interval = setInterval(() => {
      setIsPinned((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTooltipStart = () => {
    setShowTooltip(true);
    if (tooltipTimeoutRef.current != null)
      window.clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 3000);
  };

  const handleTooltipEnd = () => {
    if (tooltipTimeoutRef.current != null) {
      window.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  try {
    return (
      <div className="w-full flex items-center justify-center py-3 px-4 select-none">
        <motion.div
          initial="rest"
          animate={showTooltip ? "hover" : "rest"}
          onHoverStart={handleTooltipStart}
          onHoverEnd={handleTooltipEnd}
          className="relative"
        >
          <motion.div
            variants={{
              rest: { opacity: 0, y: 6, scale: 0.94 },
              hover: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.16em] px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: "#1A120B", color: "#fff8eb" }}
            >
              clique para ver valor
            </div>
          </motion.div>

          <motion.button
            type="button"
            onClick={() => setIsPinned((prev) => !prev)}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center gap-2 px-5 py-2 rounded-full cursor-pointer"
            style={{
              backgroundColor: `#ffffffaf`,
              border: `1.5px solid ${accentColor}40`,
            }}
          >

            <AnimatePresence mode="wait">
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="text-sm font-semibold tracking-widest uppercase"
                style={{
                  fontFamily: "var(--font-card-summary)",
                  color: accentColor,
                }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    );
  } catch (error) {
    console.error("Failed to render BasketHeader:", error);
    return (
      <div className="w-full flex items-center justify-center py-3 px-4 select-none text-sm text-[#8B7355]">
        Cabeçalho indisponível
      </div>
    );
  }
};

export default BasketHeader;