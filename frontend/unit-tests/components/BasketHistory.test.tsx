import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BasketHistoryButton } from "../../src/components/dashboard/BasketHistory";
import BasketHistoryPanel from "../../src/components/dashboard/BasketHistory";

vi.mock("framer-motion");

describe("BasketHistoryButton", () => {
  it('shows "Histórico" text when not loading', () => {
    render(<BasketHistoryButton isOpen={false} isLoading={false} onToggle={() => {}} />);
    expect(screen.getByText("Histórico")).toBeInTheDocument();
  });

  it('shows "Carregando..." text when isLoading=true', () => {
    render(<BasketHistoryButton isOpen={false} isLoading={true} onToggle={() => {}} />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<BasketHistoryButton isOpen={false} isLoading={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("BasketHistoryPanel", () => {
  const months = ["2024-02", "2024-01", "2023-12"];
  const currentMonthRef = "2024-03";

  it("does not render pills when isOpen=false", () => {
    render(
      <BasketHistoryPanel
        isOpen={false}
        months={months}
        currentMonthRef={currentMonthRef}
        selectedMonth={null}
        onMonthSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText("FEV")).not.toBeInTheDocument();
  });

  it("renders a pill for each month (excluding currentMonthRef)", () => {
    render(
      <BasketHistoryPanel
        isOpen={true}
        months={months}
        currentMonthRef={currentMonthRef}
        selectedMonth={null}
        onMonthSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("excludes the currentMonthRef pill", () => {
    render(
      <BasketHistoryPanel
        isOpen={true}
        months={["2024-03", "2024-02"]}
        currentMonthRef="2024-03"
        selectedMonth={null}
        onMonthSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("calls onMonthSelect with the month ref when a pill is clicked", () => {
    const onMonthSelect = vi.fn();
    render(
      <BasketHistoryPanel
        isOpen={true}
        months={months}
        currentMonthRef={currentMonthRef}
        selectedMonth={null}
        onMonthSelect={onMonthSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("FEV"));
    expect(onMonthSelect).toHaveBeenCalledWith("2024-02");
  });

  it("calls onMonthSelect(null) and onClose when clicking the already selected month", () => {
    const onMonthSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <BasketHistoryPanel
        isOpen={true}
        months={months}
        currentMonthRef={currentMonthRef}
        selectedMonth="2024-02"
        onMonthSelect={onMonthSelect}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("FEV"));
    expect(onMonthSelect).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
