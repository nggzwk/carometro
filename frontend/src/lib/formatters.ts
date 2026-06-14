export function formatPct(value: number | null, withSign = true): string {
  if (value === null || Number.isNaN(value)) {
    return "0%";
  }
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatBrl(value: number): string {
  if (value === 0) {
    return "R$ 0,00";
  }
  return `R$${Math.abs(value).toFixed(2).replace(".", ",")}`;
}

export function shortName(name: string): string {
  const first = name.split(" ")[0];
  return first ? first.toUpperCase() : "";
}

export function formatMonthName(monthRef: string): string {
  const [year, month] = monthRef.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleString("pt-BR", { month: "long" })
    .replace(".", "");
}
