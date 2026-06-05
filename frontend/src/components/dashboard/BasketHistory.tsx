"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAvailableMonths as defaultGetAvailableMonths } from "../../lib/basket";

interface BasketHistoryProps {
  year?: number;
  currentMonthRef?: string | null;
  selectedMonth: string | null;
  onMonthSelect: (month_ref: string | null) => void;
  getAvailableMonths?: (year: number) => Promise<string[]>;
}

const ACCENT = "#A89B8C";

function formatMonthLabel(month_ref: string): string {
  const [year, month] = month_ref.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

export default function BasketHistory({
  year = new Date().getFullYear(),
  currentMonthRef,
  selectedMonth,
  onMonthSelect,
  getAvailableMonths = defaultGetAvailableMonths,
}: BasketHistoryProps) {
  const [months, setMonths] = useState<string[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      onMonthSelect(null);
      return;
    }
    setIsLoadingMonths(true);
    const available = await getAvailableMonths(year);
    setMonths(available);
    setIsLoadingMonths(false);
    setIsOpen(true);
  };

  const handlePillClick = (month_ref: string) => {
    if (selectedMonth === month_ref) {
      setIsOpen(false);
      onMonthSelect(null);
    } else {
      onMonthSelect(month_ref);
    }
  };

  const filteredMonths = months.filter((m) => m !== currentMonthRef);

  return (
    <div className="w-full pt-4 pb-2 flex justify-center">
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${ACCENT}30`,
          backgroundColor: "#ffffffaf",
          backdropFilter: "blur(10px)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}
      >
        {/* Toggle row */}
        <motion.button
          type="button"
          onClick={handleToggle}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2 px-4 py-1 cursor-pointer select-none w-full"
        >
          {isLoadingMonths ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-2.5 h-2.5 rounded-full border-[1.5px] flex-none"
              style={{ borderColor: ACCENT, borderTopColor: "transparent" }}
            />
          ) : (
            <motion.span
              className="text-[10px] flex-none"
              style={{ color: ACCENT }}
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              ▶
            </motion.span>
          )}

          <span
            className="text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap"
            style={{ fontFamily: "var(--font-card-summary)", color: ACCENT }}
          >
            {isLoadingMonths ? "Carregando..." : "Histórico"}
          </span>
        </motion.button>

        {/* Months grid — expands below */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="months"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div
                className="border-t"
                style={{ borderColor: `${ACCENT}30` }}
              >
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${filteredMonths.length > 5 ? 4 : filteredMonths.length}, minmax(0, 1fr))` }}
                >
                  {filteredMonths.map((m, i) => {
                    const cols = filteredMonths.length > 5 ? 4 : filteredMonths.length;
                    const active = selectedMonth === m;
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    return (
                      <motion.button
                        key={m}
                        type="button"
                        onClick={() => handlePillClick(m)}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-0.5 text-xs font-normal uppercase tracking-tighter cursor-pointer whitespace-nowrap text-center"
                        style={{
                          fontFamily: "var(--font-card-summary)",
                          backgroundColor: active ? ACCENT : "transparent",
                          color: active ? "#fff" : ACCENT,
                          borderLeft: col > 0 ? `1px solid ${ACCENT}30` : "none",
                          borderTop: row > 0 ? `1px solid ${ACCENT}30` : "none",
                          transition: "background-color 0.15s, color 0.15s",
                        }}
                      >
                        {formatMonthLabel(m)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
