"use client";

import React from "react";
import { formatBrl, formatPct } from "../../lib/formatters";

interface BasketHeaderProps {
  totalInflationPct: number | null;
  totalValue: number;
  annualIpca?: number | null;
}

export const BasketHeader: React.FC<BasketHeaderProps> = ({
  totalInflationPct,
  totalValue,
  annualIpca,
}) => {
  const pct = totalInflationPct ?? 0;

  return (
    <div className="w-fit mx-auto border-1 border-black py-1.5 px-5 text-center bg-background-color rounded-[10px] select-none">
      <div className="flex items-center gap-3 justify-center">
        
        <span
          className="font-sans text-base font-black tracking-wider text-white whitespace-nowrap leading-none"
          style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
        >
          {formatPct(pct, true)}
        </span>
        
        <span className="text-sm font-bold text-black/70">＝</span>
        
        <span
          className="font-sans text-base font-black tracking-wider text-white whitespace-nowrap leading-none"
          style={{
            WebkitTextStroke: `1.2px ${
              pct < 0
                ? "#4caf50"
                : annualIpca != null && pct > annualIpca
                ? "#ef4444"
                : "#4caf50"
            }`,
            color: "#fff8eb",
          }}
        >
          {formatBrl(totalValue)}
        </span>
        
        <span className="text-xl filter drop-shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">💸</span>
      </div>
    </div>    
);
};

export default BasketHeader;