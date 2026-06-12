import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BasketFooter } from "../../src/components/dashboard/BasketFooter";

function renderFooter(
  overrides: Partial<React.ComponentProps<typeof BasketFooter>> = {},
) {
  return render(
    <BasketFooter monthlyIpca={0.5} annualIpca={4.83} ipcaMonthRef="2024-03" {...overrides} />,
  );
}

describe("BasketFooter", () => {
  it("renders the IPCA label", () => {
    renderFooter();
    expect(screen.getByText("IPCA")).toBeInTheDocument();
  });

  it("renders the monthly IPCA percentage", () => {
    renderFooter();
    expect(screen.getByText("0.5%")).toBeInTheDocument();
  });

  it("renders the annual IPCA percentage", () => {
    renderFooter();
    expect(screen.getByText("4.83%")).toBeInTheDocument();
  });

  it('displays "—" when monthlyIpca is null', () => {
    renderFooter({ monthlyIpca: null });
    expect(document.getElementById("footer-ipca-monthly")?.textContent).toBe("—");
  });

  it('displays "—" when annualIpca is null', () => {
    renderFooter({ annualIpca: null });
    expect(document.getElementById("footer-ipca-annual")?.textContent).toBe("—");
  });

  it("shows the month name derived from ipcaMonthRef", () => {
    renderFooter();
    expect(
      document.getElementById("footer-ipca-monthref")?.textContent?.toLowerCase(),
    ).toContain("mar");
  });

  it("does not render the monthref element when ipcaMonthRef is null", () => {
    renderFooter({ ipcaMonthRef: null });
    expect(document.getElementById("footer-ipca-monthref")).not.toBeInTheDocument();
  });

  it('renders "Mensal" and "Acumulado" labels', () => {
    renderFooter({ ipcaMonthRef: "2024-01" });
    expect(screen.getByText(/Mensal/i)).toBeInTheDocument();
    expect(screen.getByText(/Acumulado/i)).toBeInTheDocument();
  });
});
