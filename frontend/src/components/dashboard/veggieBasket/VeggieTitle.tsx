"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BsFillQuestionDiamondFill } from "react-icons/bs";

interface VeggieTitleProps {
  selectedMonth: string | null;
  currentMonthRef?: string | null;
  isHistoryOpen?: boolean;
  dismissed: boolean;
  onDismiss: () => void;
}

export default function VeggieTitle({ selectedMonth, currentMonthRef, isHistoryOpen, dismissed, onDismiss }: VeggieTitleProps) {
  const displayMonth = selectedMonth ?? (isHistoryOpen ? currentMonthRef : null);
  const [showTooltip, setShowTooltip] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const dismiss = () => {
    setShowTooltip(false);
    onDismiss();
  };

  const handleClick = () => {
    if (showTooltip) {
      dismiss();
    } else {
      setShowTooltip(true);
    }
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTooltip]);

  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className="text-[11px] uppercase tracking-[0.22em] font-semibold mb-1 text-center"
        style={{ color: "#A89B8C" }}
      >
        Itens monitorados
      </p>

      <div className="flex items-center justify-center mb-4">
        <h2
          className="relative text-4xl sm:text-4xl font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-header)",
            color: "#1A120B",
            letterSpacing: "-0.01em",
          }}
        >
          Feirão

          {!dismissed && (
            <motion.button
              ref={btnRef}
              type="button"
              aria-label="Inflação da cesta de hortifruti mês sobre mês"
              onClick={handleClick}
              className="absolute left-full top-0 ml-1.5 inline-flex items-center justify-center cursor-pointer"
            >
              <motion.span
                className="inline-flex"
                animate={{
                  filter: showTooltip
                    ? "drop-shadow(0 0 6px rgba(168,155,140,0.9))"
                    : [
                        "drop-shadow(0 0 0px rgba(168,155,140,0.0))",
                        "drop-shadow(0 0 5px rgba(168,155,140,0.7))",
                        "drop-shadow(0 0 0px rgba(168,155,140,0.0))",
                      ],
                }}
                transition={
                  showTooltip
                    ? { duration: 0.2 }
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <BsFillQuestionDiamondFill className="text-[15px] flex-shrink-0" style={{ color: "#A89B8C" }} />
              </motion.span>

              <span
                className={`pointer-events-none absolute z-20 inline-flex w-44 flex-col items-start rounded-2xl px-4 py-2.5 text-left text-[10px] font-medium uppercase not-italic leading-tight tracking-[0.08em] transition-all duration-200 top-full right-0 mt-2 sm:top-1/2 sm:right-auto sm:left-full sm:mt-0 sm:ml-2 sm:-translate-y-1/2 ${
                  showTooltip ? "opacity-100" : "opacity-0 translate-y-1 sm:translate-y-0"
                }`}
                style={{
                  backgroundColor: "rgba(255,255,255,0.45)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(168,155,140,0.25)",
                  boxShadow: "0 2px 12px rgba(168,155,140,0.12)",
                  color: "#6B5C4E",
                }}
              >
                <span className="block">inflação da cesta</span>
                <span className="block">de hortifruti mensal</span>
              </span>
            </motion.button>
          )}
        </h2>
      </div>

      <p
        className="text-[11px] uppercase tracking-[0.18em] font-semibold mt-1"
        style={{
          color: "#A89B8C",
          fontFamily: "var(--font-card-summary)",
          visibility: displayMonth ? "visible" : "hidden",
          minHeight: "1.4em",
        }}
      >
        {displayMonth
          ? (() => {
              const [y, m] = displayMonth.split("-").map(Number);
              return new Date(y, m - 1, 1).toLocaleString("pt-BR", {
                month: "long",
                year: "numeric",
              });
            })()
          : " "}
      </p>
    </div>
  );
}
