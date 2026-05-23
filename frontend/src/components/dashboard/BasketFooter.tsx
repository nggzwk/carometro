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
    <div className="w-full px-4 py-3 flex items-center justify-center gap-4 select-none">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: "#A89B8C", fontFamily: "var(--font-card-summary)" }}
        >
          Mensal
        </span>
        <span
          className="text-[13px] font-bold tabular-nums"
          style={{ color: "#1A120B", fontFamily: "var(--font-card-summary)" }}
        >
          {monthlyIpca !== null ? `${monthlyIpca}%` : "—"}
        </span>
      </div>

      <div
        className="text-[11px] font-light tracking-[0.3em] uppercase"
        style={{ color: "#C4B8AC", fontFamily: "var(--font-card-summary)" }}
      >
        IPCA
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-[13px] font-bold tabular-nums"
          style={{ color: "#1A120B", fontFamily: "var(--font-card-summary)" }}
        >
          {annualIpca !== null ? `${annualIpca}%` : "—"}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: "#A89B8C", fontFamily: "var(--font-card-summary)" }}
        >
          Acumulado
        </span>
      </div>
    </div>
  );
};
