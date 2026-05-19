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
        <div className="w-full max-w-md border-2 border-black py-3 px-6 text-center mb-10 bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-[0.18em] text-black uppercase">
            Vilões do Mês
          </h2>
        </div>
        <p className="font-sans text-sm text-black/70 uppercase tracking-[0.16em] text-center">
          Nenhum vilão nesse mês.
        </p>
      </div>
    );
  }

  const currentMonthName = latestMonth?.month_ref
    ? convertMonthRef(latestMonth.month_ref).toUpperCase()
    : "";

  return (
    <section className="w-full min-h-screen flex flex-col items-center justify-between bg-color-background pt-10 pb-12 px-6 snap-start selection:bg-black selection:text-white relative z-10">
      <div className="w-full flex flex-col items-center justify-start flex-1">
        <div className="w-auto min-w-[240px] border-1 border-black py-2.5 px-4 text-center mb-8 bg-color-background rounded-[10px]">
          <h2 className="font-sans text-3xl sm:text-3xl font-bold tracking-[0.2em] text-black uppercase whitespace-nowrap">
            Vilões do Mês
          </h2>
        </div>

        <PodiumBars displayItems={displayItems} />

        <div className="w-full max-w-sm text-center flex flex-col gap-1.5 subtitle text-sm sm:text-base font-normal uppercase tracking-[0.2em] text-black leading-relaxed">
          <p>A cesta básica em {currentMonthName}</p>
          <p>
            custa {Math.trunc(Number(latestMonth?.percentage_of_wage ?? 0))}% do
            salário mínimo.
          </p>
          <p className="text-xl">
            R${Math.trunc(Number(latestMonth?.basket_value_brl ?? 0))}
          </p>
        </div>
      </div>
      <ScrollIndicator />
    </section>
  );
}

// Helpers de Data
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
