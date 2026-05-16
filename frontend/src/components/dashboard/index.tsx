import React from "react";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import { formatBrl, formatPct } from "../../lib/formatters";

export const BasketSummary: React.FC<BasketSummaryProps> = ({
  items,
  totalValue,
  totalInflationPct,
  monthlyIpca,
  annualIpca,
}) => {
  return (
    <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto">
      <div className="w-full pt-4 pb-0 md:pt-6 md:pb-0 text-center flex flex-col items-center justify-center">
        <h2
          className="font-subheader text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest relative select-none"
          style={{ WebkitTextStroke: "1.5px black", color: "#fff8eb" }}
        >
          BASICÃO
          <span className="absolute -top-1 -right-3 text-lg text-blue-300 font-bold font-sans">
            ?
          </span>
        </h2>

        <div
          className="flex justify-center items-center gap-2 mt-6 font-subheader font-black text-xl lg:text-[26px] tracking-wide select-none text-[#ffffff] leading-none"
          style={{ WebkitTextStroke: "1px black" }}
        >
          <span 
            className="font-mono text-[20px] md:text-[18px] lg:text-[24px] xl:text-[28px] font-bold tracking-tighter whitespace-nowrap leading-none"
            style={{ WebkitTextStroke: "1px black" }}
          >
            {formatPct(totalInflationPct, true)}
          </span>
          <span style={{ WebkitTextStroke: "1px black"}}>＝</span>
          <span 
            className="font-mono text-[20px] md:text-[18px] lg:text-[24px] xl:text-[28px] font-bold tracking-tighter whitespace-nowrap leading-none"
            style={{ WebkitTextStroke: "1px black" }}
          >
            {formatBrl(totalValue)}
          </span>
          <span className="text-3xl">💸</span>
        </div>
      </div>

      <div className="bg-brand border-1 border-[#242424] rounded-[10px] overflow-hidden p-0.5">
        <ItemGrid items={items} />

        <BasketFooter monthlyIpca={monthlyIpca} annualIpca={annualIpca} />
      </div>
    </div>
  );
};

export default BasketSummary;
