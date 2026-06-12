import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import RankingGrid from "../../src/components/graphs/Ranking/RankingGrid";
import type { GlobalBasketRankingRow } from "../../src/lib/globalBaskets";

vi.mock("framer-motion");

vi.mock("../../src/lib/globalBaskets", async () => {
  const actual = await import("../../src/lib/globalBaskets");
  return {
    ...actual,
    translateCountry: (name: string) => name,
    formatUsd: (v: number) => `$${v.toFixed(2)}`,
    formatPercent: (v: number) => `${v.toFixed(2)}%`,
    formatHours: (v: number) => `${v.toFixed(1)} h`,
  };
});

function makeRow(rank: number, country = "Brazil"): GlobalBasketRankingRow {
  return {
    id: rank,
    rank,
    country_region: country,
    responsible_authority: "IBGE",
    raw_monthly_min_wage: 1320,
    raw_basket_cost: 700,
    workweek_hours: 44,
    last_updated_at: null,
    rate_to_usd: 5.0,
    rate_updated_at: null,
    monthly_min_wage_usd: 264,
    basket_cost_usd: 140,
    monthly_min_wage_brl: 1320,
    basket_cost_brl: 700,
    basket_usd: 140,
    wage_pct: 53.03,
    hours_needed: 170,
  };
}

describe("RankingGrid", () => {
  it("renders the Ranking heading", () => {
    render(<RankingGrid rows={[makeRow(1)]} />);
    expect(screen.getByRole("heading", { name: /Ranking/i })).toBeInTheDocument();
  });

  it("renders the empty state message when rows is empty", () => {
    render(<RankingGrid rows={[]} />);
    expect(
      screen.getByText(/Nenhum dado de cesta global encontrado/i),
    ).toBeInTheDocument();
  });

  it("renders a row card for each entry", () => {
    render(<RankingGrid rows={[makeRow(1, "Brazil"), makeRow(2, "Germany"), makeRow(3, "USA")]} />);
    expect(document.getElementById("ranking-row-1")).not.toBeNull();
    expect(document.getElementById("ranking-row-2")).not.toBeNull();
    expect(document.getElementById("ranking-row-3")).not.toBeNull();
  });

  it("displays the rank number in the badge", () => {
    render(<RankingGrid rows={[makeRow(1, "Brazil")]} />);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("shows the USD basket cost for each row", () => {
    render(<RankingGrid rows={[makeRow(1)]} />);
    const usdEls = document.querySelectorAll('[id^="ranking-1-usd"]');
    expect(usdEls.length).toBeGreaterThan(0);
    expect(usdEls[0].textContent).toContain("140");
  });

  it("shows the wage percentage for each row", () => {
    render(<RankingGrid rows={[makeRow(1)]} />);
    const wagePctEls = document.querySelectorAll('[id^="ranking-1-wage-pct"]');
    expect(wagePctEls.length).toBeGreaterThan(0);
    expect(wagePctEls[0].textContent).toContain("53");
  });

  it("expands a mobile card when clicked", () => {
    render(<RankingGrid rows={[makeRow(1, "Brazil")]} />);
    fireEvent.click(document.querySelectorAll("article")[0]);
    expect(screen.getByText(/Toque para fechar/i)).toBeInTheDocument();
  });

  it("collapses the expanded card when clicked again", () => {
    render(<RankingGrid rows={[makeRow(1, "Brazil")]} />);

    const article = document.querySelectorAll("article")[0];
    act(() => { fireEvent.click(article); });
    act(() => { fireEvent.click(article); });

    expect(screen.queryByText(/Toque para fechar/i)).not.toBeInTheDocument();
  });

  it("renders the lastUpdatedAt label when provided", () => {
    render(<RankingGrid rows={[makeRow(1)]} lastUpdatedAt="2024-03-15T00:00:00Z" />);
    expect(screen.getByText(/Cotação atualizada em/i)).toBeInTheDocument();
  });
});
