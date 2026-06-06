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
import { useHistoricalFeirao } from "../../hooks/useHistoricalFeirao";
import { inViewMotionProps } from "../../lib/motionPresets";
import { getAvailableMonths } from "../../lib/basket";
import { getVeggieAvailableMonths } from "../../lib/veggieBasket";
import ChangeMenu from "./ChangeMenu";
import VeggieTitle from "./veggieBasket/VeggieTitle";

type View = "basicao" | "feirao";

interface DashboardProps extends BasketSummaryProps {
  feiraoProps: BasketSummaryProps;
}

export const BasketSummary: React.FC<DashboardProps> = ({ feiraoProps, ...liveProps }) => {
  const basicao = useHistoricalBasket(liveProps);
  const feirao = useHistoricalFeirao(feiraoProps);

  const [view, setView] = useState<View>("basicao");
  const [months, setMonths] = useState<string[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [basicaoDismissed, setBasicaoDismissed] = useState(false);
  const [feiraoDismissed, setFeiraoDismissed] = useState(false);

  const active = view === "basicao" ? basicao : feirao;
  const { selectedMonth, activeData, isLoadingHistory, handleMonthSelect } = active;

  const handleMenuClick = () => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      handleMonthSelect(null);
      setMonths([]);
    }
    setView((v) => (v === "basicao" ? "feirao" : "basicao"));
  };

  const handleHistoryToggle = async () => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      handleMonthSelect(null);
      return;
    }
    setIsLoadingMonths(true);
    const fn = view === "basicao" ? getAvailableMonths : getVeggieAvailableMonths;
    const available = await fn(new Date().getFullYear());
    setMonths(available);
    setIsLoadingMonths(false);
    setIsHistoryOpen(true);
  };

  const menuLabel = view === "basicao" ? "Feirão" : "Basicão";
  const currentMonthRef =
    view === "basicao"
      ? liveProps.items[0]?.month_ref ?? null
      : feiraoProps.items[0]?.month_ref ?? null;

  return (
    <div className="w-full text-center flex flex-col items-center">
      <motion.div {...inViewMotionProps} className="mt-8 mb-1">
        <AnimatePresence mode="wait">
          {view === "basicao" ? (
            <motion.div
              key="basicao-title"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <BasketTitle selectedMonth={selectedMonth} dismissed={basicaoDismissed} onDismiss={() => setBasicaoDismissed(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="feirao-title"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <VeggieTitle selectedMonth={selectedMonth} dismissed={feiraoDismissed} onDismiss={() => setFeiraoDismissed(true)} />
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="absolute top-2 right-2 z-20 sm:hidden">
          <ChangeMenu variant="icon" onClick={handleMenuClick} />
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
                style={{ borderColor: "#e0aa59", borderTopColor: "transparent" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <BasketHeader
          totalInflationPct={activeData.totalInflationPct}
          totalValue={activeData.totalValue}
          annualIpca={activeData.annualIpca ?? basicao.activeData.annualIpca}
          monthlyIpca={activeData.monthlyIpca}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${selectedMonth ?? "live"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ItemGrid items={activeData.items} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

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
          annualIpca={activeData.annualIpca ?? basicao.activeData.annualIpca}
        />

        <div className="flex-1 flex justify-end">
          <ChangeMenu label={menuLabel} onClick={handleMenuClick} />
        </div>
      </div>

      <div className="w-full flex sm:hidden flex-col items-center px-1">
        <BasketFooter
          monthlyIpca={activeData.monthlyIpca}
          annualIpca={activeData.annualIpca ?? basicao.activeData.annualIpca}
        />
        <div className="pb-2">
          <BasketHistoryButton
            isOpen={isHistoryOpen}
            isLoading={isLoadingMonths}
            onToggle={handleHistoryToggle}
          />
        </div>
      </div>

      <BasketHistoryPanel
        isOpen={isHistoryOpen}
        months={months}
        currentMonthRef={currentMonthRef}
        selectedMonth={selectedMonth}
        onMonthSelect={handleMonthSelect}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default BasketSummary;
