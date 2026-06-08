import UpdateBanner from "../components/shared/UpdateBanner";
import Menu from "../components/shared/Menu";
import DashboardWrapper from "../components/DashboardWrapper";
import { getBasketSummaryProps, getLatestMonthRef } from "../lib/basket";
import { getVeggieBasketSummaryProps } from "../lib/veggieBasket";
import { getLatestVillainsMonth, getLatestFeiraoVillains } from "../lib/villains";
import AxisGraph from "../components/graphs/Axis/AxisGraph";
import Ranking from "../components/graphs/Ranking/Ranking";

export default async function Home() {
  const [basketSummary, feiraoSummary, feiraoVillains, basicaoVillains, latestMonthRef] =
    await Promise.all([
      getBasketSummaryProps(),
      getVeggieBasketSummaryProps(),
      getLatestFeiraoVillains(),
      getLatestVillainsMonth(),
      getLatestMonthRef(),
    ]);

  return (
    <div className="min-h-screen bg-brand text-black overflow-x-hidden">
      <UpdateBanner latestMonthRef={latestMonthRef} />

      <header>
        <Menu />
        <section
          className="space-y-1 w-full flex flex-col items-center text-center mt-6 md:mt-8"
          aria-labelledby="carometro-title"
        >
          <h1
            id="carometro-title"
            className="heading max-w-3xl text-3xl leading-none sm:text-7xl"
          >
            CARÔMETRO
          </h1>

          <div
            className="w-[60vw] h-[0.5px] bg-black mt-0 mb-1 mx-auto" 
            aria-hidden="true"
          />

          <p
            className="small-header text-xs uppercase tracking-widest"
          >
            a inflação da cesta básica curitibana
          </p>
        </section>
      </header>

      <main className="px-6 pt-8 pb-12 sm:px-10 lg:px-16">
        <DashboardWrapper
          basketSummary={basketSummary}
          feiraoSummary={feiraoSummary}
          basicaoVillains={basicaoVillains}
          feiraoVillains={feiraoVillains}
        />

        <section>
          <Ranking />
        </section>

        <section>
          <AxisGraph />
        </section>
      </main>

      <footer className="w-full py-6 text-center text-sm text-gray-600">
        <p>
          Desenvolvido por{" "}
          <a
            href="https://github.com/nggzwk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            nggzwk
          </a>
        </p>
      </footer>
    </div>
  );
}
