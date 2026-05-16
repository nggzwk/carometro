import React from "react";

interface BasketFooterProps {
  monthlyIpca: number | null;
  annualIpca: number | null;
}

export const BasketFooter: React.FC<BasketFooterProps> = ({
  monthlyIpca,
  annualIpca,
}) => {
  return (
    <div className="w-full bg-brand border-t-1 border-black px-4 py-2 flex items-center gap-3">
      <span className="subtitle uppercase font-sans font-black text-[12px] text-black tracking-normal leading-none flex-1 text-left whitespace-nowrap">
        MENSAL {monthlyIpca !== null ? `${monthlyIpca}%` : "0.0%"}
      </span>
      <div className="flex items-center justify-center gap-2 subtitle uppercase font-sans font-black text-[14px] text-black tracking-normal leading-none flex-1 whitespace-nowrap">
        <span className="text-black select-none leading-none" aria-hidden="true">
          ‹
        </span>
        <span className="leading-none">IPCA</span>
        <span className="text-black select-none leading-none" aria-hidden="true">
          ›
        </span>
      </div>
      <span className="subtitle uppercase font-sans font-black text-[12px] text-black tracking-normal leading-none flex-1 text-right whitespace-nowrap">
        {annualIpca !== null ? `${annualIpca}%` : "0.0%"} ACUMULADO
      </span>
    </div>
  );
};
