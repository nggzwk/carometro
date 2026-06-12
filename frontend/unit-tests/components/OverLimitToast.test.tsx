import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OverLimitToast from "../../src/components/custom/OverLimitToast";

vi.mock("framer-motion");

describe("OverLimitToast", () => {
  it("renders nothing when show=false", () => {
    const { container } = render(<OverLimitToast show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the limit message when show=true", () => {
    render(<OverLimitToast show={true} />);
    expect(screen.getByText(/Limite de 300 itens atingido/i)).toBeInTheDocument();
  });

  it("includes the item limit number in the message", () => {
    render(<OverLimitToast show={true} />);
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });
});
