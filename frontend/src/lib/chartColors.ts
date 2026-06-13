export const SERIES_COLORS = {
  inflation: "#3971268e",
  wageIncrease: "#5c83ae",
  ipca: "#906dad",
} as const;

export type SeriesKey = keyof typeof SERIES_COLORS;
