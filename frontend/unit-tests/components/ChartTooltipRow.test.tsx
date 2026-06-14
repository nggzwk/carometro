import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  ChartTooltipRow,
  type TooltipMetric,
} from "../../src/components/graphs/shared/ChartTooltipRow";

const baseMetric: TooltipMetric = {
  key: "ipca",
  color: "#ddb03f",
  value: 4.83,
};

describe("ChartTooltipRow", () => {
  it("renders the row with the default 'chart-tooltip' id prefix", () => {
    render(<ChartTooltipRow metric={baseMetric} />);
    expect(document.getElementById("chart-tooltip-ipca")).not.toBeNull();
    expect(
      document.getElementById("chart-tooltip-ipca-value")?.textContent,
    ).toBe("+4.83%");
  });

  it("uses a custom id prefix when provided", () => {
    render(<ChartTooltipRow metric={baseMetric} idPrefix="line-tooltip" />);
    expect(document.getElementById("line-tooltip-ipca")).not.toBeNull();
    expect(
      document.getElementById("line-tooltip-ipca-value")?.textContent,
    ).toBe("+4.83%");
  });

  it("shows '-' for a null value", () => {
    render(<ChartTooltipRow metric={{ ...baseMetric, value: null }} />);
    expect(
      document.getElementById("chart-tooltip-ipca-value")?.textContent,
    ).toBe("-");
  });

  it("renders the BRL value when provided", () => {
    render(
      <ChartTooltipRow
        metric={{ key: "item", color: "#000", value: 10, brl: "R$ 25,00" }}
      />,
    );
    expect(document.getElementById("chart-tooltip-item-brl")?.textContent).toBe(
      "R$ 25,00",
    );
  });

  it("omits the BRL element when no brl is provided", () => {
    render(<ChartTooltipRow metric={baseMetric} />);
    expect(document.getElementById("chart-tooltip-ipca-brl")).toBeNull();
  });

  it("renders the partial-period label when provided", () => {
    render(
      <ChartTooltipRow
        metric={{ ...baseMetric, partialLabel: "até maio" }}
      />,
    );
    const partial = document.getElementById("chart-tooltip-ipca-partial");
    expect(partial?.textContent).toBe("até maio");
  });
});
