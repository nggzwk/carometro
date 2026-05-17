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
    <div className="w-full bg-brand px-4 py-3 flex items-center justify-center gap-6 md:gap-8 select-none">
      <span className="subtitle uppercase font-sans text-[15px] text-black tracking-tight leading-none whitespace-nowrap">
        <strong className="mr-1.5">MENSAL</strong>
        <span className="font-black">
          {monthlyIpca !== null ? `${monthlyIpca}%` : "0,0%"}
        </span>
      </span>

      <div className="flex items-center gap-1.5 subtitle uppercase font-sans text-[14px] text-black tracking-normal leading-none whitespace-nowrap">
        <span className="leading-none font-black">‹ IPCA ›</span>
      </div>

      <span className="subtitle uppercase font-sans text-[15px] text-black tracking-tight leading-none whitespace-nowrap">
        <span className="mr-1.5 font-black">
          {annualIpca !== null ? `${annualIpca}%` : "0,0%"}
        </span>
        <strong>ACUMULADO</strong>
      </span>
    </div>
  );
};
