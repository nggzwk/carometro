"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import ScrollIndicator from "../shared/ScrollIndicator";
import BasketHeader from "./BasketHeader"; // Já importado aqui!

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
  const scrollIndicatorRef = useRef<HTMLDivElement | null>(null);
  const scrollIndicatorInView = useInView(scrollIndicatorRef, {
    amount: 0.35,
    once: false,
  });

  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div
        {...inViewMotionProps}
        className="w-full flex flex-col items-center justify-start"
      >
        <motion.div {...inViewMotionProps} className="mt-8">
          <div className="w-fit mx-auto border-1 border-black py-2.5 px-8 text-center bg-color-background rounded-[10px]">
            <h2 className="font-sans text-3xl sm:text-3xl font-bold tracking-[0.2em] text-black uppercase whitespace-nowrap">
              BASICÃO
            </h2>
          </div>
        </motion.div>

        <motion.div {...inViewMotionProps} className="mt-4">
          <BasketHeader
            totalInflationPct={totalInflationPct}
            totalValue={totalValue}
            annualIpca={annualIpca}
          />
        </motion.div>
      </motion.div>

      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-hidden rounded-[16px] border-1 border-black p-1
                   bg-white/40 backdrop-blur-xl 
                   shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]"
      >
        <ItemGrid items={items} />
        <BasketFooter monthlyIpca={monthlyIpca} annualIpca={annualIpca} />
      </motion.div>

      <motion.div
        ref={scrollIndicatorRef}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={
          scrollIndicatorInView
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 20, scale: 0.98 }
        }
        className="w-full flex items-center justify-end pt-6"
      >
        <ScrollIndicator />
      </motion.div>
    </div>
  );
};

export default BasketSummary;