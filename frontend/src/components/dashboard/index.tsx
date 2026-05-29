"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BsFillQuestionDiamondFill } from "react-icons/bs";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import ScrollIndicator from "../shared/ScrollIndicator";
import BasketHeader from "./BasketHeader";

const inViewMotionProps = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: false, amount: 0.25 },
  transition: {
    duration: 0.75,
    ease: [0.16, 1, 0.3, 1] as const,
  },
};

export const BasketSummary: React.FC<BasketSummaryProps> = ({
  items,
  totalValue,
  totalInflationPct,
  monthlyIpca,
  annualIpca,
}) => {
  const [showIconTooltip, setShowIconTooltip] = useState(false);

  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div {...inViewMotionProps} className="mt-8 mb-4">
        <div className="flex flex-col items-center gap-1">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
            style={{ color: "#A89B8C" }}
          >
            Itens monitorados
          </p>

          <h2
            className="relative inline-flex items-start text-3xl sm:text-4xl font-bold tracking-tight mb-2"
            style={{
              fontFamily: "var(--font-header)",
              color: "#1A120B",
              letterSpacing: "-0.01em",
            }}
          >
            <span className="relative inline-flex items-center">
              <span>Basicão</span>
              <button
                type="button"
                aria-label="Inflação da cesta básica mensal mês sobre mês"
                className="group/icon relative ml-2 inline-flex items-center justify-center"
                onClick={() => setShowIconTooltip((value) => !value)}
                onBlur={() => setShowIconTooltip(false)}
                onMouseEnter={() => setShowIconTooltip(true)}
                onMouseLeave={() => setShowIconTooltip(false)}
              >
                <BsFillQuestionDiamondFill className="text-[9px] flex-shrink-0" />
                <span
                  className={`pointer-events-none absolute left-full top-1/2 z-20 ml-2 inline-flex w-32 -translate-y-1/2 flex-col items-start rounded-2xl border border-[#D8CFC4] bg-white px-3 py-2 text-left text-[8px] font-medium uppercase not-italic leading-tight tracking-[0.08em] text-[#5C5146] shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 ${showIconTooltip ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"} group-hover/icon:translate-x-0 group-hover/icon:opacity-100`}
                >
                  <span className="block">inflação da cesta</span>
                  <span className="block">básica mensal</span>
                  <span className="block">mês sobre mês</span>
                </span>
              </button>
            </span>
          </h2>
        </div>
      </motion.div>

      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-visible rounded-3xl"
        style={{
          background: "#ffffffaf",
          border: "1px solid rgba(200, 185, 170, 0.35)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
        }}
      >
        <BasketHeader
          totalInflationPct={totalInflationPct}
          totalValue={totalValue}
          annualIpca={annualIpca}
          monthlyIpca={monthlyIpca}
        />

        <ItemGrid items={items} />
      </motion.div>

      <BasketFooter monthlyIpca={monthlyIpca} annualIpca={annualIpca} />

      <ScrollIndicator />
    </div>
  );
};

export default BasketSummary;
