"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import BasketHeader from "./BasketHeader";
import BasketHistory from "./BasketHistory";
import BasketTitle from "./BasketTitle";
import { useHistoricalBasket } from "../../hooks/useHistoricalBasket";
import { inViewMotionProps } from "../../lib/motionPresets";

export const BasketSummary: React.FC<BasketSummaryProps> = (liveProps) => {
  const { selectedMonth, activeData, isLoadingHistory, handleMonthSelect } =
    useHistoricalBasket(liveProps);

  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div {...inViewMotionProps} className="mt-8 mb-1">
        <BasketTitle selectedMonth={selectedMonth} />
      </motion.div>

      <motion.div
        {...inViewMotionProps}
        className="w-full overflow-visible rounded-3xl relative"
        style={{
          background: "#ffffffaf",
          border: "1px solid rgba(200, 185, 170, 0.35)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
        }}
      >
        <AnimatePresence>
          {isLoadingHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl"
              style={{
                backgroundColor: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(4px)",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 rounded-full border-2"
                style={{
                  borderColor: "#e0aa59",
                  borderTopColor: "transparent",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <BasketHeader
          totalInflationPct={activeData.totalInflationPct}
          totalValue={activeData.totalValue}
          annualIpca={activeData.annualIpca}
          monthlyIpca={activeData.monthlyIpca}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMonth ?? "live"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ItemGrid items={activeData.items} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <BasketFooter
        monthlyIpca={activeData.monthlyIpca}
        annualIpca={activeData.annualIpca}
      />

      <BasketHistory
        year={new Date().getFullYear()}
        currentMonthRef={liveProps.items[0]?.month_ref ?? null}
        selectedMonth={selectedMonth}
        onMonthSelect={handleMonthSelect}
      />
    </div>
  );
};

export default BasketSummary;
