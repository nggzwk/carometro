import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BasketHeader } from "../../src/components/dashboard/BasketHeader";

vi.mock("framer-motion");

vi.mock("../../src/lib/formatters", () => ({
  formatPct: (v: number, _signed?: boolean) => `${v.toFixed(2)}%`,
  formatBrl: (v: number) => `R$ ${v.toFixed(2)}`,
}));

function matchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("BasketHeader", () => {
  beforeEach(() => {
    matchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Aumentou" when pct >= 0.1', () => {
    render(<BasketHeader totalInflationPct={5.5} totalValue={250} />);
    expect(screen.getByText(/Aumentou/i)).toBeInTheDocument();
  });

  it('shows "Diminuiu" when pct < 0', () => {
    render(<BasketHeader totalInflationPct={-2.3} totalValue={220} />);
    expect(screen.getByText(/Diminuiu/i)).toBeInTheDocument();
  });

  it("clicking the toggle button switches from inflation label to BRL value", () => {
    render(<BasketHeader totalInflationPct={5.5} totalValue={250.0} />);
    fireEvent.click(document.getElementById("header-inflation-toggle")!);
    expect(screen.getByText(/R\$ 250/)).toBeInTheDocument();
  });

  it("clicking toggle again switches back to inflation label", () => {
    render(<BasketHeader totalInflationPct={5.5} totalValue={250} />);

    const toggle = document.getElementById("header-inflation-toggle")!;
    act(() => { fireEvent.click(toggle); });
    act(() => { fireEvent.click(toggle); });

    expect(document.getElementById("header-inflation-label")?.textContent).toMatch(/Aumentou/i);
  });

  it("uses red accent when pct exceeds annualIpca benchmark", () => {
    render(<BasketHeader totalInflationPct={10} totalValue={300} annualIpca={4} />);
    expect(document.getElementById("header-inflation-label")!.style.color).toBe("rgb(230, 57, 70)");
  });

  it("uses teal accent when pct is below annualIpca benchmark", () => {
    render(<BasketHeader totalInflationPct={2} totalValue={200} annualIpca={4} />);
    expect(document.getElementById("header-inflation-label")!.style.color).toBe("rgb(42, 157, 143)");
  });
});
