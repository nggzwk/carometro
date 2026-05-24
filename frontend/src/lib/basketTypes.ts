export type BasketItemData = {
  produto_categoria: number;
  produto_subcategoria: number;
  item_name: string;
  qtd_embalagem: string;
  month_ref: string;
  month_price: string;
  previous_price: string | null;
  mom_pct: number | null;
};

export type MonthlyPriceData = {
  month_ref: string;
  median_price: string;
};

export type BasketSummaryProps = {
  items: BasketItemData[];
  totalValue: number;
  totalInflationPct: number;
  monthlyIpca: number | null;
  annualIpca: number | null;
};
