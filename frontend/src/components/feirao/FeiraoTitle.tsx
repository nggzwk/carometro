"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BsFillQuestionDiamondFill } from "react-icons/bs";

interface FeiraoTitleProps {
  selectedMonth: string | null;
}

export default function FeiraoTitle({ selectedMonth }: FeiraoTitleProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
        style={{ color: "#A89B8C" }}
      >
        Itens monitorados
      </p>

      <h2
        className="relative inline-flex items-start text-3xl sm:text-4xl font-bold tracking-tight mb-4"
        style={{
          fontFamily: "var(--font-header)",
          color: "#1A120B",
          letterSpacing: "-0.01em",
        }}
      >
        <span className="relative inline-flex items-center">
          <span>Feirao</span>
          <button
            type="button"
            aria-label="Inflacao do feirao mensal mes sobre mes"
            className="group/icon relative ml-2 inline-flex items-center justify-center"
            onClick={() => setShowTooltip((v) => !v)}
            onBlur={() => setShowTooltip(false)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <BsFillQuestionDiamondFill className="text-[15px] flex-shrink-0" />
            <span
              className={`pointer-events-none absolute left-full top-1/2 z-20 ml-2 inline-flex w-32 -translate-y-1/2 flex-col items-start rounded-2xl border border-[#D8CFC4] bg-white px-3 py-2 text-left text-[8px] font-medium uppercase not-italic leading-tight tracking-[0.08em] text-[#5C5146] shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 ${
                showTooltip
                  ? "translate-x-0 opacity-100"
                  : "translate-x-1 opacity-0"
              }`}
            >
              <span className="block">inflacao da cesta</span>
              <span className="block">de hortifruti</span>
              <span className="block">mes sobre mes</span>
            </span>
          </button>
        </span>
      </h2>

      <motion.p
        animate={{ opacity: selectedMonth ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="text-[11px] uppercase tracking-[0.18em] font-semibold mt-1"
        style={{ color: "#A89B8C", fontFamily: "var(--font-card-summary)" }}
      >
        {selectedMonth
          ? (() => {
              const [y, m] = selectedMonth.split("-").map(Number);
              return new Date(y, m - 1, 1).toLocaleString("pt-BR", {
                month: "long",
                year: "numeric",
              });
            })()
          : " "}
      </motion.p>
    </div>
  );
}
