"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
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
  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div {...inViewMotionProps} className="mt-8 mb-4">
        <div className="flex flex-col items-center gap-1">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: "#A89B8C" }}
          >
            Itens monitorados
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-header)",
              fontStyle: "italic",
              color: "#1A120B",
              letterSpacing: "-0.01em",
            }}
          >
            Basicão
          </h2>
        </div>
      </motion.div>

      {/* Card container — soft, not rigid */}
      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-visible rounded-3xl"
        style={{
          background: "#ffffffaf",
          border: "1px solid rgba(200, 185, 170, 0.35)",
          boxShadow:
            "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
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
