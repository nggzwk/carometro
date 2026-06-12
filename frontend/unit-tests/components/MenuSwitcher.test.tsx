import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MenuSwitcher from "../../src/components/custom/MenuSwitcher";

vi.mock("framer-motion");

describe("MenuSwitcher", () => {
  it("displays BASICÃO label for menu=basicao", () => {
    render(<MenuSwitcher menu="basicao" onToggle={() => {}} />);
    expect(screen.getByText("BASICÃO")).toBeInTheDocument();
  });

  it("displays FEIRÃO label for menu=feirao", () => {
    render(<MenuSwitcher menu="feirao" onToggle={() => {}} />);
    expect(screen.getByText("FEIRÃO")).toBeInTheDocument();
  });

  it("calls onToggle when the left arrow button is clicked", () => {
    const onToggle = vi.fn();
    render(<MenuSwitcher menu="basicao" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu anterior" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle when the right arrow button is clicked", () => {
    const onToggle = vi.fn();
    render(<MenuSwitcher menu="basicao" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo menu" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders two navigation buttons", () => {
    render(<MenuSwitcher menu="basicao" onToggle={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
