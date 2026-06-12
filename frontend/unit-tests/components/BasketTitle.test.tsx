import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import BasketTitle from "../../src/components/dashboard/BasketTitle";

vi.mock("framer-motion");

vi.mock("react-icons/bs", () => ({
  BsFillQuestionDiamondFill: (props: any) => (
    <span data-testid="help-icon" {...props} />
  ),
}));

const defaultProps = {
  selectedMonth: null,
  dismissed: false,
  onDismiss: vi.fn(),
};

describe("BasketTitle", () => {
  it('renders the "Basicão" heading', () => {
    render(<BasketTitle {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Basicão/i })).toBeInTheDocument();
  });

  it("renders the help icon when dismissed=false", () => {
    render(<BasketTitle {...defaultProps} dismissed={false} />);
    expect(screen.getByTestId("help-icon")).toBeInTheDocument();
  });

  it("does not render the help icon when dismissed=true", () => {
    render(<BasketTitle {...defaultProps} dismissed={true} />);
    expect(screen.queryByTestId("help-icon")).not.toBeInTheDocument();
  });

  it("shows the tooltip text after clicking the help button", () => {
    render(<BasketTitle {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: /inflação da cesta básica mensal mês sobre mês/i }),
    );
    expect(screen.getByText(/inflação da cesta/i)).toBeInTheDocument();
  });

  it("calls onDismiss when help button is clicked a second time (tooltip open → dismiss)", () => {
    const onDismiss = vi.fn();
    render(<BasketTitle {...defaultProps} onDismiss={onDismiss} />);

    const helpBtn = screen.getByRole("button", {
      name: /inflação da cesta básica mensal mês sobre mês/i,
    });
    act(() => { fireEvent.click(helpBtn); });
    act(() => { fireEvent.click(helpBtn); });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders the selected month when selectedMonth is provided", () => {
    render(<BasketTitle {...defaultProps} selectedMonth="2024-03" />);
    expect(screen.getByText(/março/i)).toBeInTheDocument();
  });

  it("hides the month label (visibility:hidden) when no month is provided", () => {
    render(<BasketTitle {...defaultProps} selectedMonth={null} />);
    const hiddenPara = Array.from(document.querySelectorAll("p")).find(
      (p) => p.style.visibility === "hidden",
    );
    expect(hiddenPara).toBeDefined();
  });

  it('renders "Itens monitorados" sub-label', () => {
    render(<BasketTitle {...defaultProps} />);
    expect(screen.getByText(/Itens monitorados/i)).toBeInTheDocument();
  });
});
