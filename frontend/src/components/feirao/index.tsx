"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItemGrid } from "../dashboard/ItemGrid";
import { BasketFooter } from "../dashboard/BasketFooter";
import { BasketHeader } from "../dashboard/BasketHeader";
import BasketHistory from "../dashboard/BasketHistory";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import { inViewMotionProps } from "../../lib/motionPresets";
import { getVeggieBasketDataForMonth, getVeggieAvailableMonths } from "../../lib/vegetableBasket";
import { useState } from "react";
import FeiraoTitle from "./FeiraoTitle";

function useHistoricalFeirao(liveProps: BasketSummaryProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [historicalData, setHistoricalData] = React.useState<BasketSummaryProps | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  const handleMonthSelect = async (month_ref: string | null) => {
    setSelectedMonth(month_ref);
    if (!month_ref) {
      setHistoricalData(null);
      return;
    }
    setIsLoadingHistory(true);
    const data = await getVeggieBasketDataForMonth(month_ref);
    setHistoricalData(data);
    setIsLoadingHistory(false);
  };

  return {
    selectedMonth,
    activeData: historicalData ?? liveProps,
    isLoadingHistory,
    handleMonthSelect,
  };
}

export const FeiraoSummary: React.FC<BasketSummaryProps> = (liveProps) => {
  const { selectedMonth, activeData, isLoadingHistory, handleMonthSelect } =
    useHistoricalFeirao(liveProps);

  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div {...inViewMotionProps} className="mt-8 mb-1">
        <FeiraoTitle selectedMonth={selectedMonth} />
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
        getAvailableMonths={getVeggieAvailableMonths}
      />
    </div>
  );
};

export default FeiraoSummary;
