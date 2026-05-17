"use client";

import React from "react";
import { motion } from "framer-motion";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import { formatBrl, formatPct } from "../../lib/formatters";
import ScrollIndicator from "../shared/ScrollIndicator";

const inViewMotionProps = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: false, amount: 0.35 },
  transition: {
    duration: 0.7,
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
      <motion.div
        {...inViewMotionProps}
        className="w-full flex flex-col items-center justify-start flex-1"
      >
        <div className="w-auto min-w-[240px] border-1 border-black py-2.5 px-4 text-center bg-color-background rounded-nonetext-">
          <h2 className="font-sans text-3xl sm:text-3xl font-bold tracking-[0.2em] text-black uppercase whitespace-nowrap">
            BASICÃO
          </h2>
        </div>

        <div className="w-full pt-6 text-center flex flex-col items-center justify-center">
          <div className="align-center flex items-center gap-2">
            <span
              className="footer text-xl text-white whitespace-nowrap leading-none"
              style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
            >
              {formatPct(totalInflationPct, true)}
            </span>
            <span className="text-xl text-black">＝</span>
            <span
              className="footer text-xl text-white whitespace-nowrap tracking-widest leading-none"
              style={{
                WebkitTextStroke: `1.5px ${
                  totalInflationPct < 0
                    ? "#4caf50"
                    : annualIpca != null && totalInflationPct > annualIpca
                      ? "#e63946d1"
                      : "#4caf50"
                }`,
                color: "#fff8eb",
              }}
            >
              {formatBrl(totalValue)}
            </span>
            <span className="text-3xl">💸</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-hidden rounded-[10px] border-1 border-black p-1
                   bg-background/40 backdrop-blur-xl 
                   shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] 
                   before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/20 before:pointer-events-none"
      >
        <ItemGrid items={items} />
        <BasketFooter monthlyIpca={monthlyIpca} annualIpca={annualIpca} />
      </motion.div>

      <ScrollIndicator />
    </div>
  );
};

export default BasketSummary;
