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

      expect(screen.getByLabelText("Arroz")).toBeInTheDocument();
      expect(screen.getByLabelText("Óleo")).toBeInTheDocument();
      expect(screen.queryByLabelText("Feijão")).not.toBeInTheDocument();
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

      expect(screen.getByLabelText("Arroz")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Feijão")).toHaveAttribute("aria-pressed", "false");
    });

    it("selects the first item with data even when earlier items are empty", () => {
      const series: ItemLineSeries[] = [
        { subcategoria: ARROZ, points: [] },
        makeSeries(FEIJAO),
      ];
      render(<LineGraphChart series={series} />);

      expect(screen.getByLabelText("Feijão")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("legend interaction", () => {
    it("clicking an inactive item selects it and deselects the previous one", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByLabelText("Feijão"));

      expect(screen.getByLabelText("Feijão")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Arroz")).toHaveAttribute("aria-pressed", "false");
    });

    it("clicking the active item deselects it, leaving no item active", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByLabelText("Arroz"));

      expect(screen.getByLabelText("Arroz")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByLabelText("Feijão")).toHaveAttribute("aria-pressed", "false");
    });

    it("toggling back re-selects a previously deselected item", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      fireEvent.click(screen.getByLabelText("Arroz"));
      fireEvent.click(screen.getByLabelText("Arroz"));

      expect(screen.getByLabelText("Arroz")).toHaveAttribute("aria-pressed", "true");
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

    it("each legend button has an accessible label matching the item name", () => {
      const series = [makeSeries(ARROZ), makeSeries(FEIJAO)];
      render(<LineGraphChart series={series} />);

      expect(screen.getByLabelText("Arroz")).toBeInTheDocument();
      expect(screen.getByLabelText("Feijão")).toBeInTheDocument();
    });

    it("legend buttons no longer use the native title tooltip", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);
      const button = document.getElementById(`line-legend-${ARROZ}`);
      expect(button).not.toHaveAttribute("title");
    });
  });

  describe("salário / ipca subtitle", () => {
    it("renders both the SALÁRIO and IPCA subtitle entries", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);

      expect(document.getElementById("line-subtitle-salario")).toBeInTheDocument();
      expect(document.getElementById("line-subtitle-ipca")).toBeInTheDocument();
      expect(screen.getByText("SALÁRIO")).toBeInTheDocument();
      expect(screen.getByText("IPCA")).toBeInTheDocument();
    });
  });

  describe("menu switcher (basicão / feirão)", () => {
    const TOMATE = 50008;
    const BATATA_INGLESA = 50005;
    const BATATA_DOCE = 50004;

    const feiraoSeries: ItemLineSeries[] = [
      makeSeries(TOMATE),
      makeSeries(BATATA_INGLESA),
      makeSeries(BATATA_DOCE),
    ];

    const clickNext = () =>
      fireEvent.click(document.getElementById("line-graph-next")!);
    const clickPrev = () =>
      fireEvent.click(document.getElementById("line-graph-prev")!);

    it("renders the previous/next arrow controls", () => {
      render(<LineGraphChart series={[makeSeries(ARROZ)]} />);

      expect(document.getElementById("line-graph-prev")).toBeInTheDocument();
      expect(document.getElementById("line-graph-next")).toBeInTheDocument();
    });

    it("shows BASICÃO by default and switches to FEIRÃO on toggle", () => {
      render(
        <LineGraphChart series={[makeSeries(ARROZ)]} feiraoSeries={feiraoSeries} />,
      );
      expect(document.getElementById("line-graph-title")?.textContent).toBe(
        "BASICÃO",
      );

      clickNext();
      expect(document.getElementById("line-graph-title")?.textContent).toBe(
        "FEIRÃO",
      );
    });

    it("renders feirão legend items (with the batata labels) after switching", () => {
      render(
        <LineGraphChart series={[makeSeries(ARROZ)]} feiraoSeries={feiraoSeries} />,
      );
      expect(screen.queryByLabelText("Tomate")).not.toBeInTheDocument();

      clickNext();

      expect(screen.getByLabelText("Tomate")).toBeInTheDocument();
      expect(screen.getByLabelText("Inglesa")).toBeInTheDocument();
      expect(screen.getByLabelText("Doce")).toBeInTheDocument();
      expect(screen.queryByLabelText("Arroz")).not.toBeInTheDocument();
    });

    it("selects the first feirão item when switching menus", () => {
      render(
        <LineGraphChart series={[makeSeries(ARROZ)]} feiraoSeries={feiraoSeries} />,
      );
      clickNext();

      expect(screen.getByLabelText("Tomate")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("toggles back to BASICÃO", () => {
      render(
        <LineGraphChart series={[makeSeries(ARROZ)]} feiraoSeries={feiraoSeries} />,
      );
      clickNext();
      clickPrev();

      expect(document.getElementById("line-graph-title")?.textContent).toBe(
        "BASICÃO",
      );
      expect(screen.getByLabelText("Arroz")).toBeInTheDocument();
    });

    it("does not show loading when only the feirão series has data", () => {
      const emptyBasicao = BASICAO_SUBCATS.map((s) => ({
        subcategoria: s,
        points: [],
      }));
      render(
        <LineGraphChart series={emptyBasicao} feiraoSeries={feiraoSeries} />,
      );

      expect(screen.queryByText("Carregando dados...")).not.toBeInTheDocument();
      expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
    });

    it("shows loading only when both baskets are empty", () => {
      render(<LineGraphChart series={[]} feiraoSeries={[]} />);
      expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
    });
  });
});
