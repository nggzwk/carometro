import { useState } from "react";
import type { BasketSummaryProps } from "../lib/basketTypes";
import { getVeggieBasketDataForMonth } from "../lib/veggieBasket";

export function useHistoricalFeirao(liveProps: BasketSummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<BasketSummaryProps | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
