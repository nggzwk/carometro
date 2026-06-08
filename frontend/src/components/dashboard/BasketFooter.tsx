import React from "react";

interface BasketFooterProps {
  monthlyIpca: number | null;
  annualIpca: number | null;
  ipcaMonthRef: string | null;
}

function formatMonthName(monthRef: string): string {
  const [year, month] = monthRef.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleString("pt-BR", { month: "long" })
    .replace(".", "")
    .toUpperCase();
}

export const BasketFooter: React.FC<BasketFooterProps> = ({
  monthlyIpca,
  annualIpca,
  ipcaMonthRef,
}) => {
  try {
    return (
      <div id="basket-footer" className="w-full px-4 py-3 flex items-center justify-center gap-4 select-none">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.18em] font-medium"
            style={{ color: "#A89B8C", fontFamily: "var(--font-card-summary)" }}
          >
            Mensal
          </span>
          <span
            id="footer-ipca-monthly"
            className="text-[13px] font-bold tabular-nums"
            style={{ color: "#1A120B", fontFamily: "var(--font-card-summary)" }}
          >
            {monthlyIpca !== null ? `${monthlyIpca}%` : "—"}
          </span>
        </div>

        <div className="relative flex items-center">
          <div
            id="footer-ipca-label"
            className="text-[12px] font-semibold tracking-widest uppercase leading-none"
            style={{ color: "#C4B8AC", fontFamily: "var(--font-card-summary)" }}
          >
            IPCA
          </div>
          {ipcaMonthRef && (
            <div
              id="footer-ipca-monthref"
              className="absolute top-full left-1/2 -translate-x-1/2 pt-0.5 text-[9px] uppercase tracking-wide whitespace-nowrap"
              style={{ color: "#998f85", fontFamily: "var(--font-card-summary)" }}
            >
              {formatMonthName(ipcaMonthRef)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            id="footer-ipca-annual"
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
  } catch (error) {
    console.error("Failed to render BasketFooter:", error);
    return (
      <div className="w-full px-4 py-3 flex items-center justify-center select-none text-[11px] text-[#A89B8C]">
        Dados indisponíveis
      </div>
    );
  }
};
