import React from "react";
import type { BasketItemData } from "../../lib/basketTypes";
import { ItemCard } from "./ItemCard";

interface ItemGridProps {
  items: BasketItemData[];
  totalInflationPct?: number | null;
  totalValue?: number;
  annualIpca?: number | null;
}

export const ItemGrid: React.FC<ItemGridProps> = ({ items }) => {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-3 bg-transparent"
      style={{ gap: "10px" }}
    >
      {items.map((item, i) => (
        <ItemCard
          key={`${item.produto_subcategoria}-${item.month_ref}`}
          item={item}
          index={i}
        />
      ))}
    </div>
  );
};
