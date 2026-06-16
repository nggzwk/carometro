export const SERIES_COLORS = {
  wageIncrease: "#34b17f",
  ipca: "#ddb03f",
  dieese: "#2d2272",
} as const;

export type SeriesKey = keyof typeof SERIES_COLORS;

export const CHART_MARGIN = {
  top: 20,
  right: 30,
  left: 5,
  bottom: 20,
} as const;

export const AXIS_STROKE = "#8B7355";

export const AXIS_TICK = {
  fill: "#8B7355",
  fontSize: 13,
  fontFamily: "var(--font-card-summary)",
} as const;

export const AXIS_LINE = { stroke: "#d4c4b0", strokeWidth: 1.5 } as const;

export const GRID_PROPS = {
  stroke: "#f3efe8",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const pctTickFormatter = (value: number) => `${value}%`;

export const X_AXIS_PROPS = {
  dataKey: "year",
  stroke: AXIS_STROKE,
  tick: AXIS_TICK,
  tickMargin: 10,
  axisLine: AXIS_LINE,
} as const;

export const Y_AXIS_PROPS = {
  yAxisId: "pct",
  stroke: AXIS_STROKE,
  tick: AXIS_TICK,
  tickFormatter: pctTickFormatter,
  width: 62,
  tickMargin: 4,
  axisLine: AXIS_LINE,
} as const;
