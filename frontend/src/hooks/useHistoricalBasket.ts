import { useState } from "react";
import type { BasketSummaryProps } from "../lib/basketTypes";
import { fetchBasketMonth } from "../lib/historyActions";

export function useHistoricalBasket(liveProps: BasketSummaryProps) {
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
    const data = await fetchBasketMonth(month_ref);
    setHistoricalData(data);
    setIsLoadingHistory(false);
  };

  const activeData = historicalData ?? liveProps;

  return { selectedMonth, activeData, isLoadingHistory, handleMonthSelect };
}
