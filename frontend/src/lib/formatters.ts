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
