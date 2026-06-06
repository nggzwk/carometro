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
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const exceedsBenchmark =
    (annualIpca != null && pct > annualIpca) ||
    (monthlyIpca != null && pct > monthlyIpca);

  const accentColor = exceedsBenchmark ? "#E63946" : "#2A9D8F";

  const totalValueEmoji =
    pct < 0 ? "🙂" : pct > 15 ? "☠️" : pct > 10 ? "😭" : pct > 5 ? "😱" : pct < 4 ? "😐" : "💰";

  const showTotalValue = isPinned;
  const label = showTotalValue
    ? `${formatBrl(totalValue)} ${totalValueEmoji}`
    : pct >= 0.1
      ? `Aumentou ${formatPct(pct, true)}`
      : `Diminuiu -${formatPct(Math.abs(pct), false)}`;

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;
    const interval = setInterval(() => {
      setIsPinned((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) return;
    if (hasInteracted) return;
    const interval = setInterval(() => {
      setIsPinned((prev) => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, [hasInteracted]);

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
              className="text-[10px] font-medium uppercase tracking-[0.16em] rounded-xl px-3 py-1.5 whitespace-nowrap"
              style={{
                backgroundColor: "rgba(255,255,255,0.45)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(168,155,140,0.25)",
                boxShadow: "0 2px 12px rgba(168,155,140,0.12)",
                color: "#6B5C4E",
              }}
            >
              clique para ver valor
            </div>
          </motion.div>

          <motion.button
            type="button"
            onClick={() => {
              setHasInteracted(true);
              setIsPinned((prev) => !prev);
            }}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center gap-3 cursor-pointer py-2 px-1"
          >
            <span
              style={{
                display: "block",
                width: 18,
                height: 1,
                backgroundColor: accentColor,
                opacity: 0.35,
                flexShrink: 0,
              }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="uppercase whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-card-summary)",
                  color: accentColor,
                  fontSize: "1rem",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
            <span
              style={{
                display: "block",
                width: 18,
                height: 1,
                backgroundColor: accentColor,
                opacity: 0.35,
                flexShrink: 0,
              }}
            />
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