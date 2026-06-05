"use client";

import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#A89B8C";

function formatMonthLabel(month_ref: string): string {
  const [year, month] = month_ref.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

interface BasketHistoryButtonProps {
  isOpen: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function BasketHistoryButton({ isOpen, isLoading, onToggle }: BasketHistoryButtonProps) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${ACCENT}30`,
        backgroundColor: "#ffffffaf",
        backdropFilter: "blur(10px)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.97 }}
        className="flex items-center justify-center gap-2 px-4 py-1 cursor-pointer select-none w-full"
      >
        <span
          className="text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap"
          style={{ fontFamily: "var(--font-card-summary)", color: ACCENT }}
        >
          {isLoading ? "Carregando..." : "Histórico"}
        </span>
        {isLoading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-2.5 h-2.5 rounded-full border-[1.5px] flex-none"
            style={{ borderColor: ACCENT, borderTopColor: "transparent" }}
          />
        ) : (
          <motion.span
            className="text-[10px] flex-none"
            style={{ color: "#1A120B" }}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            ▶
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}

interface BasketHistoryPanelProps {
  isOpen: boolean;
  months: string[];
  currentMonthRef?: string | null;
  selectedMonth: string | null;
  onMonthSelect: (month_ref: string | null) => void;
}

export default function BasketHistoryPanel({
  isOpen,
  months,
  currentMonthRef,
  selectedMonth,
  onMonthSelect,
}: BasketHistoryPanelProps) {
  const filteredMonths = months.filter((m) => m !== currentMonthRef);

  const handlePillClick = (month_ref: string) => {
    if (selectedMonth === month_ref) {
      onMonthSelect(null);
    } else {
      onMonthSelect(month_ref);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && filteredMonths.length > 0 && (
        <motion.div
          key="months-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden"
        >
          <div
            className="rounded-xl overflow-hidden mt-1"
            style={{
              border: `1px solid ${ACCENT}30`,
              backgroundColor: "#ffffffaf",
              backdropFilter: "blur(10px)",
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${filteredMonths.length > 5 ? 4 : filteredMonths.length}, minmax(0, 1fr))`,
              }}
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
                    className="px-3 py-1 text-xs font-normal uppercase tracking-tighter cursor-pointer whitespace-nowrap text-center"
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
  );
}
