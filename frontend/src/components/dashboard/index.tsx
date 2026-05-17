import React from "react";
import { ItemGrid } from "./ItemGrid";
import { BasketFooter } from "./BasketFooter";
import type { BasketSummaryProps } from "../../lib/basketTypes";
import { formatBrl, formatPct } from "../../lib/formatters";
import ScrollIndicator from "../shared/ScrollIndicator";

export const BasketSummary: React.FC<BasketSummaryProps> = ({
  items,
  totalValue,
  totalInflationPct,
  monthlyIpca,
  annualIpca,
}) => {
  return (
    <div className="w-full text-center flex flex-col items-center">
      <h2
        className="font-subheader text-3xl sm:text-4xl font-bold tracking-[0.2em] relative select-none items-center justify-center flex mb-4 border-[1px] border-black p-4 w-fit"
        style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
      >
        BASICÃO
      </h2>

      <div className="w-full pt-4 text-center flex flex-col items-center justify-center">
        <div className="align-center flex items-center gap-2">
          <span
            className="font-subheader text-[22px] text-white whitespace-nowrap leading-none"
            style={{ WebkitTextStroke: "1px black", color: "#fff8eb" }}
          >
            {formatPct(totalInflationPct, true)}
          </span>
          <span style={{ WebkitTextStroke: "1px black" }}>＝</span>
          <span
            className="font-subheader text-[22px] text-white whitespace-nowrap leading-none"
            style={{
              WebkitTextStroke: `1.5px ${
                totalInflationPct < 0
                  ? "#4caf50"
                  : annualIpca != null && totalInflationPct > annualIpca
                    ? "#ef4444"
                    : "#4caf50"
              }`,
              color: "#fff8eb",
            }}
          >
            {formatBrl(totalValue)}
          </span>
          <span className="text-3xl">💸</span>
        </div>
      </div>

      <div className="bg-brand border-1 border-[#242424] rounded-[10px] p-0.5 w-full overflow-hidden">
        <ItemGrid items={items}/>
        <BasketFooter monthlyIpca={monthlyIpca} annualIpca={annualIpca} />
      </div>
      
      <ScrollIndicator />
    </div>
  );
};

export default BasketSummary;