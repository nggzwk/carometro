"use client";

import { useState } from "react";
import BasketSummary from "./dashboard/index";
import VillainsChart from "./graphs/Villains/VillainsChart";
import type { BasketSummaryProps } from "../lib/basketTypes";
import type { MonthlyVillainsData } from "../lib/villains";

type View = "basicao" | "feirao";

interface Props {
  basketSummary: BasketSummaryProps;
  feiraoSummary: BasketSummaryProps;
  basicaoVillains: MonthlyVillainsData | null;
  feiraoVillains: MonthlyVillainsData | null;
}

export default function DashboardWrapper({
  basketSummary,
  feiraoSummary,
  basicaoVillains,
  feiraoVillains,
}: Props) {
  const [view, setView] = useState<View>("basicao");

  const villainsData =
    view === "feirao"
      ? (feiraoVillains ?? basicaoVillains)
      : (basicaoVillains ?? feiraoVillains);

  const villainsSource: View =
    view === "feirao" && feiraoVillains != null ? "feirao" : "basicao";

  return (
    <>
      <section>
        <BasketSummary
          {...basketSummary}
          feiraoProps={feiraoSummary}
          onViewChange={setView}
        />
      </section>
      <section>
        <VillainsChart data={villainsData} source={villainsSource} />
      </section>
    </>
  );
}
