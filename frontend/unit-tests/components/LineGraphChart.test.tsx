import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LineGraphChart from "../../src/components/graphs/LineGraph/LineGraphChart";
import type { ItemLineSeries } from "../../src/lib/itemLines";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Area: () => null,
  ReferenceLine: () => null,
}));

const ARROZ = 40003;
const FEIJAO = 40012;
const OLEO = 60001;

const makePoint = (year: string, value: number, priceBrl: number) => ({
  year,
  value,
  priceBrl,
});

const makeSeries = (
  subcategoria: number,
  points = [makePoint("2023", 10.5, 25.0)],
): ItemLineSeries => ({ subcategoria, points });

const BASICAO_SUBCATS = [40003, 40012, 60001, 40017, 90001, 30001, 80002, 20001, 10011, 10023];

describe("LineGraphChart", () => {
  describe("loading state", () => {
    it("renders loading spinner when all series have empty points", () => {
      const emptySeries = BASICAO_SUBCATS.map((s) => ({ subcategoria: s, points: [] }));
      render(<LineGraphChart series={emptySeries} />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });

    it("renders loading spinner when series array is empty", () => {
      render(<LineGraphChart series={[]} />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });

    it("does not render the chart when loading", () => {
      render(<LineGraphChart series={[]} />);
      expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("renders the BASICÃO title", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);
      expect(screen.getByText("BASICÃO")).toBeInTheDocument();
    });

    it("renders the subtitle label", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);
      expect(screen.getByText(/gráfico de inflação acumulada/i)).toBeInTheDocument();
    });
  });

  describe("legend rendering", () => {
    it("renders legend buttons only for series that have data points", () => {
      const series: ItemLineSeries[] = [
        makeSeries(ARROZ),
        { subcategoria: FEIJAO, points: [] },
        makeSeries(OLEO),
      ];
      render(<LineGraphChart series={series} />);

      expect(screen.getByTitle("Arroz")).toBeInTheDocument();
      expect(screen.getByTitle("Óleo")).toBeInTheDocument();
      expect(screen.queryByTitle("Feijão")).not.toBeInTheDocument();
    });

    it("renders a legend button for each item that has points", () => {
      const series = BASICAO_SUBCATS.map((s) => makeSeries(s));
      render(<LineGraphChart series={series} />);

      const legendButtons = document.querySelectorAll('[id^="line-legend-"]');
      expect(legendButtons).toHaveLength(BASICAO_SUBCATS.length);
    });
  });

  describe("initial selection", () => {
    it("marks the first selectable item as active (aria-pressed=true)", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      expect(screen.getByTitle("Arroz")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTitle("Feijão")).toHaveAttribute("aria-pressed", "false");
    });

    it("selects the first item with data even when earlier items are empty", () => {
      const series: ItemLineSeries[] = [
        { subcategoria: ARROZ, points: [] },
        makeSeries(FEIJAO),
      ];
      render(<LineGraphChart series={series} />);

      expect(screen.getByTitle("Feijão")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("legend interaction", () => {
    it("clicking an inactive item selects it and deselects the previous one", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByTitle("Feijão"));

      expect(screen.getByTitle("Feijão")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTitle("Arroz")).toHaveAttribute("aria-pressed", "false");
    });

    it("clicking the active item deselects it, leaving no item active", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByTitle("Arroz"));

      expect(screen.getByTitle("Arroz")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByTitle("Feijão")).toHaveAttribute("aria-pressed", "false");
    });

    it("toggling back re-selects a previously deselected item", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByTitle("Arroz"));
      fireEvent.click(screen.getByTitle("Arroz"));

      expect(screen.getByTitle("Arroz")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("accessibility", () => {
    it("chart container has descriptive aria-label", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);
      const chart = document.getElementById("line-graph-chart");
      expect(chart).toHaveAttribute(
        "aria-label",
        "Gráfico de preço acumulado por item do basicão",
      );
    });

    it("renders the legend container with the correct id", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);
      expect(document.getElementById("line-graph-legend")).toBeInTheDocument();
    });

    it("each legend button has a title matching the item name", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      expect(screen.getByTitle("Arroz")).toBeInTheDocument();
      expect(screen.getByTitle("Feijão")).toBeInTheDocument();
    });
  });
});
