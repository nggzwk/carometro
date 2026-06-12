import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TotalCart from "../../src/components/custom/TotalCart";
import type { CartLine } from "../../src/components/custom/types";

vi.mock("framer-motion");

vi.mock("../../src/lib/formatters", () => ({
  formatBrl: (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}));

function makeLine(subcat: number, name: string, qty = 1, price = 10): CartLine {
  return {
    subcat,
    name,
    fullName: name,
    sigla: "KG",
    icon: "🍚",
    qty,
    price,
    subtotal: price * qty,
    insertOrder: 0,
  };
}

const noopProps = {
  count: 0,
  total: 0,
  isOpen: false,
  onToggle: () => {},
  onRemove: () => {},
  onClear: () => {},
};

describe("TotalCart", () => {
  it('shows "MINHA CESTA" label when cart is empty', () => {
    render(<TotalCart {...noopProps} lines={[]} />);
    expect(screen.getByText("MINHA CESTA")).toBeInTheDocument();
  });

  it("shows item count in label when cart has items", () => {
    render(
      <TotalCart
        {...noopProps}
        lines={[makeLine(1, "Arroz"), makeLine(2, "Feijão")]}
        count={2}
        total={20}
      />,
    );
    expect(screen.getByText(/2 ITENS/)).toBeInTheDocument();
  });

  it('uses "ITEM" (singular) when count is exactly 1', () => {
    render(<TotalCart {...noopProps} lines={[makeLine(1, "Arroz")]} count={1} total={10} />);
    expect(screen.getByText("1 ITEM")).toBeInTheDocument();
  });

  it("calls onToggle when the trigger button is clicked", () => {
    const onToggle = vi.fn();
    render(<TotalCart {...noopProps} lines={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /minha cesta/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders empty-state message inside the open panel", () => {
    render(<TotalCart {...noopProps} lines={[]} isOpen={true} />);
    expect(screen.getByText(/toque nos itens para montar sua cesta/i)).toBeInTheDocument();
  });

  it("lists item names when panel is open with lines", () => {
    render(
      <TotalCart
        {...noopProps}
        lines={[makeLine(1, "Arroz"), makeLine(2, "Feijão")]}
        count={2}
        total={20}
        isOpen={true}
      />,
    );
    expect(screen.getByText("Arroz")).toBeInTheDocument();
    expect(screen.getByText("Feijão")).toBeInTheDocument();
  });

  it("calls onRemove with the correct subcat when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <TotalCart
        {...noopProps}
        lines={[makeLine(40003, "Arroz")]}
        count={1}
        total={10}
        isOpen={true}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Remover um Arroz/i }));
    expect(onRemove).toHaveBeenCalledWith(40003);
  });

  it("calls onClear when the Limpar button is clicked", () => {
    const onClear = vi.fn();
    render(
      <TotalCart
        {...noopProps}
        lines={[makeLine(1, "Arroz")]}
        count={1}
        total={10}
        isOpen={true}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows the subtotal for each line", () => {
    render(
      <TotalCart
        {...noopProps}
        lines={[makeLine(1, "Arroz", 2, 5)]}
        count={2}
        total={10}
        isOpen={true}
      />,
    );
    expect(screen.getAllByText(/R\$ 10/).length).toBeGreaterThanOrEqual(1);
  });
});
