import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartTooltip } from "../../src/components/graphs/Axis/ChartTooltip";

vi.mock("../../src/components/graphs/Axis/ChartTooltip.module.css", () => ({
  default: {},
  tooltipAnchor: "tooltipAnchor",
  tooltip: "tooltip",
  metric: "metric",
  metricClickable: "metricClickable",
  square: "square",
  metricValues: "metricValues",
  value: "value",
  brlValue: "brlValue",
  tooltipRight: "tooltipRight",
  tooltipLeft: "tooltipLeft",
}));

const baseProps = {
  x: 100,
  y: 80,
  inflation: 12.5,
  ipca: 4.83,
  wageIncrease: 3.0,
  basePrice: 200,
  visible: true,
  onRequestClose: vi.fn(),
};

describe("ChartTooltip", () => {
  it("renders nothing when visible=false", () => {
    const { container } = render(<ChartTooltip {...baseProps} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart-tooltip element when visible=true", () => {
    render(<ChartTooltip {...baseProps} />);
    expect(document.getElementById("chart-tooltip")).not.toBeNull();
  });

  it("shows formatted inflation value with sign", () => {
    render(<ChartTooltip {...baseProps} inflation={12.5} />);
    expect(
      document.getElementById("chart-tooltip-inflation-value")?.textContent,
    ).toBe("+12.50%");
  });

  it("shows negative inflation with minus sign", () => {
    render(<ChartTooltip {...baseProps} inflation={-3.2} />);
    expect(
      document.getElementById("chart-tooltip-inflation-value")?.textContent,
    ).toBe("-3.20%");
  });

  it('shows "-" for null inflation', () => {
    render(<ChartTooltip {...baseProps} inflation={null} />);
    expect(
      document.getElementById("chart-tooltip-inflation-value")?.textContent,
    ).toBe("-");
  });

  it("shows ipca value in the tooltip", () => {
    render(<ChartTooltip {...baseProps} ipca={4.83} />);
    expect(
      document.getElementById("chart-tooltip-ipca-value")?.textContent,
    ).toBe("+4.83%");
  });

  it("shows wageIncrease value in the tooltip", () => {
    render(<ChartTooltip {...baseProps} wageIncrease={3.0} />);
    expect(
      document.getElementById("chart-tooltip-wageIncrease-value")?.textContent,
    ).toBe("+3.00%");
  });

  it("clicking the inflation metric expands the BRL value", () => {
    render(<ChartTooltip {...baseProps} inflation={10} basePrice={200} />);

    const inflationMetric = document.getElementById("chart-tooltip-inflation");
    fireEvent.click(inflationMetric!);

    const brl = document.getElementById("chart-tooltip-inflation-brl");
    expect(brl).not.toBeNull();
    // 200 * (1 + 10/100) = 220
    expect(brl?.textContent).toMatch(/R\$|220/);
  });

  it("clicking the expanded inflation metric collapses it", () => {
    render(<ChartTooltip {...baseProps} inflation={10} basePrice={200} />);

    const inflationMetric = document.getElementById("chart-tooltip-inflation");
    fireEvent.click(inflationMetric!); // expand
    fireEvent.click(inflationMetric!); // collapse

    expect(
      document.getElementById("chart-tooltip-inflation-brl"),
    ).toBeNull();
  });

  it("calls onRequestClose when clicking outside the tooltip", () => {
    const onRequestClose = vi.fn();
    render(
      <div>
        <ChartTooltip {...baseProps} onRequestClose={onRequestClose} />
        <button id="outside">Outside</button>
      </div>,
    );

    fireEvent.pointerDown(document.getElementById("outside")!);

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
