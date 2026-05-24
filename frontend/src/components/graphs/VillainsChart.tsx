import { getLatestVillainsMonth } from "../../lib/villains";
import ScrollIndicator from "../shared/ScrollIndicator";
import PodiumBars from "./PodiumBars";

export default async function VillainsChart() {
  const latestMonth = await getLatestVillainsMonth();
  const items = latestMonth?.villains ?? [];
  const displayItems = items.slice(0, 3);

  if (displayItems.length === 0) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-color-background p-6 snap-start">
        <EmptyState />
      </div>
    );
  }

  const currentMonthName = latestMonth?.month_ref
    ? convertMonthRef(latestMonth.month_ref)
    : "";

  const basketValue = Math.trunc(Number(latestMonth?.basket_value_brl ?? 0));
  const wagePercent = Math.trunc(Number(latestMonth?.percentage_of_wage ?? 0));

  return (
    <section className="w-full min-h-screen flex flex-col items-center justify-between bg-color-background pt-12 pb-12 px-6 snap-start selection:bg-black selection:text-white relative z-10">
      <div className="w-full flex flex-col items-center justify-start flex-1 max-w-sm mx-auto">
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-1"
          style={{
            fontFamily: "var(--font-subheader)",
            color: "#1A120B",
            letterSpacing: "-0.01em",
          }}
        >
          Vilões do Mês
        </h2>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 mb-11 border border-#black shadow-sm"
          style={{ backgroundColor: "#ffffff", color: "#000000" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#949494" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--font-card-summary)" }}
          >
            {currentMonthName}
          </span>
        </div>

        <PodiumBars displayItems={displayItems} />

        <div
          className="w-full rounded-2xl overflow-hidden mt-2"
          style={{
            border: "1px solid #E8DDD3",
            backgroundColor: "#ffffffaf",
            boxShadow: "0 2px 16px 0 rgba(0, 0, 0, 0.04)",
          }}
        >
          <div className="flex divide-x divide-[#E8DDD3]">
            <div className="flex-1 flex flex-col items-center justify-center py-5 px-3 gap-0.5">
              <span
                className="text-[10px] uppercase tracking-[0.16em] font-medium"
                style={{ color: "#A89B8C" }}
              >
                Cesta básica
              </span>
              <span
                className="text-2xl font-bold mt-1"
                style={{
                  fontFamily: "var(--font-subheader)",
                  color: "#1A120B",
                  letterSpacing: "-0.02em",
                }}
              >
                R${basketValue}
              </span>
              <span className="text-[10px] uppercase" style={{ color: "#A89B8C" }}>
                em {currentMonthName}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-5 px-3 gap-0.5">
              <span
                className="text-[10px] uppercase tracking-[0.16em] font-medium"
                style={{ color: "#A89B8C" }}
              >
                Do salário mínimo
              </span>
              <span
                className="text-2xl font-bold mt-1"
                style={{
                  fontFamily: "var(--font-subheader)",
                  color: "#E11D48",
                  letterSpacing: "-0.02em",
                }}
              >
                {wagePercent}%
              </span>
              <span className="text-[10px] uppercase" style={{ color: "#A89B8C" }}>
                por pessoa
              </span>
            </div>
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ backgroundColor: "#EDE0D4" }}
      >
        🛒
      </div>
      <p
        className="text-sm uppercase tracking-[0.18em] font-medium"
        style={{ color: "#A89B8C" }}
      >
        Nenhum vilão nesse mês.
      </p>
    </div>
  );
}

// Helpers
const monthNames: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

function convertMonthRef(monthRef: string): string {
  const month = monthRef.split("-")[1];
  return monthNames[month] || monthRef;
}
