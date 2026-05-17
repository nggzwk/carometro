import UpdateBanner from "../components/shared/UpdateBanner";
import BasketSummary from "../components/dashboard/index";
import { getBasketSummaryProps } from "../lib/basket";
import VillainsChart from "../components/graphs/VillainsChart";

export default async function Home() {
  const basketSummary = await getBasketSummaryProps();

  return (
    <div className="min-h-screen bg-brand text-black">
      <header>
        <UpdateBanner />
        <section
          className="space-y-1 w-full flex flex-col items-center text-center mt-6 md:mt-8"
          aria-labelledby="carometro-title"
        >
          <h1
            id="carometro-title"
            className="heading max-w-3xl text-5xl leading-none sm:text-7xl"
          >
            CARÔMETRO
          </h1>

          <div
            className="w-[80vw] h-[1px] bg-black mt-0 mb-1 mx-auto"
            aria-hidden="true"
          />

          <p className="small-header text-sm lowercase tracking-[0.20em]">
            a inflação da cesta básica curitibana
          </p>
        </section>
      </header>

      <main className="px-6 pt-8 pb-12 sm:px-10 lg:px-16">
        <section>
          <BasketSummary {...basketSummary} />
        </section>

        <VillainsChart />
      </main>
    </div>
  );
}
