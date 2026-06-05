"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import BasketHeader from "./BasketHeader";
import BasketHistoryPanel, { BasketHistoryButton } from "./BasketHistory";
import BasketTitle from "./BasketTitle";
import { useHistoricalBasket } from "../../hooks/useHistoricalBasket";
import { inViewMotionProps } from "../../lib/motionPresets";
import { getAvailableMonths } from "../../lib/basket";
import ChangeMenu from "./ChangeMenu";

const ACCENT = "#A89B8C";

export const BasketSummary: React.FC<BasketSummaryProps> = (liveProps) => {
  const { selectedMonth, activeData, isLoadingHistory, handleMonthSelect } =
    useHistoricalBasket(liveProps);

  const [months, setMonths] = useState<string[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleHistoryToggle = async () => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      handleMonthSelect(null);
      return;
    }
    setIsLoadingMonths(true);
    const available = await getAvailableMonths(new Date().getFullYear());
    setMonths(available);
    setIsLoadingMonths(false);
    setIsHistoryOpen(true);
  };

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
        {/* Mobile-only: arrow button top-right of card */}
        <div className="absolute top-2 right-2 z-20 sm:hidden">
          <ChangeMenu variant="icon" onClick={() => {}} />
        </div>
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

      {/* Desktop footer row: HISTÓRICO | stats | MENU */}
      <div className="w-full hidden sm:flex items-center px-1 py-1">
        <div className="flex-1 flex justify-start">
          <BasketHistoryButton
            isOpen={isHistoryOpen}
            isLoading={isLoadingMonths}
            onToggle={handleHistoryToggle}
          />
        </div>

        <BasketFooter
          monthlyIpca={activeData.monthlyIpca}
          annualIpca={activeData.annualIpca}
        />

        <div className="flex-1 hidden sm:flex justify-end">
          <ChangeMenu onClick={() => {}} />
        </div>
      </div>

      {/* Mobile footer: stats centered + HISTÓRICO centered below */}
      <div className="w-full flex sm:hidden flex-col items-center px-1">
        <BasketFooter
          monthlyIpca={activeData.monthlyIpca}
          annualIpca={activeData.annualIpca}
        />
        <div className="pb-2">
          <BasketHistoryButton
            isOpen={isHistoryOpen}
            isLoading={isLoadingMonths}
            onToggle={handleHistoryToggle}
          />
        </div>
      </div>

      {/* Expandable history panel */}
      <BasketHistoryPanel
        isOpen={isHistoryOpen}
        months={months}
        currentMonthRef={liveProps.items[0]?.month_ref ?? null}
        selectedMonth={selectedMonth}
        onMonthSelect={handleMonthSelect}
      />
    </div>
  );
};

export default BasketSummary;
