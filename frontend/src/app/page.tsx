import UpdateBanner from "../components/shared/UpdateBanner";
import Menu from "../components/shared/Menu";
import DashboardWrapper from "../components/DashboardWrapper";
import { getBasketSummaryProps } from "../lib/basket";
import { getVeggieBasketSummaryProps } from "../lib/veggieBasket";
import {
  getLatestVillainsMonth,
  getLatestFeiraoVillains,
} from "../lib/villains";
import AxisGraph from "../components/graphs/Axis/AxisGraph";
import Ranking from "../components/graphs/Ranking/Ranking";
import Footer from "../components/shared/Footer";


export default async function Home() {
  const [basketSummary, feiraoSummary, feiraoVillains, basicaoVillains] =
    await Promise.all([
      getBasketSummaryProps(),
      getVeggieBasketSummaryProps(),
      getLatestFeiraoVillains(),
      getLatestVillainsMonth(),
    ]);

  return (
    <div className="min-h-screen bg-brand text-black overflow-x-hidden">
      <UpdateBanner />

      <header>
        <Menu />
        <section
          className="space-y-1 w-full flex flex-col items-center text-center mt-6 md:mt-8"
          aria-labelledby="carometro-title"
        >
          <h1
            id="carometro-title"
            className="heading max-w-4xl text-4xl leading-none sm:text-7xl"
          >
            CARÔMETRO
          </h1>

          <div
            className="w-[70vw] h-[0.5px] bg-black mt-0 mb-1 mx-auto"
            aria-hidden="true"
          />

          <p className="small-header text-xs uppercase tracking-widest">
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

      <Footer />
    </div>
  );
}
