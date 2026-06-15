"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
} from "recharts";
import { basketTypesIcons } from "../../../lib/basketIcons";
import dieesseIcon from "./dieese2.png";
import {
  SERIES_COLORS,
  CHART_MARGIN,
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
} from "../shared/chartTheme";
import { MetricsLegend } from "../shared/MetricsLegend";
import { ChartLoading } from "../shared/ChartLoading";
import { ChartDot } from "./ChartDot";
import { ChartTooltip } from "./ChartTooltip";
import surfaceStyles from "../shared/chartSurface.module.css";

export type DataPoint = {
  year: string;
  value: number | null;
  inflation: number | null;
  ipca: number | null;
  ipcaPartialLabel: string | null;
  wageIncrease: number | null;
};

type TooltipData = {
  x: number;
  y: number;
  index: number;
  inflation: number | null;
  ipca: number | null;
  ipcaPartialLabel: string | null;
  wageIncrease: number | null;
};

type AxisGraphChartProps = {
  data: DataPoint[];
  basePrice: number;
  baseSalary: number;
};

export default function AxisGraphChart({
  data,
  basePrice,
  baseSalary,
}: AxisGraphChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const showTooltip = (index: number, cx: number, cy: number) => {
    const point = data[index];
    if (!point) return;

    setHoveredIndex(index);
    setTooltipData({
      x: cx,
      y: cy,
      index,
      inflation: point.inflation,
      ipca: point.ipca,
      ipcaPartialLabel: point.ipcaPartialLabel,
      wageIncrease: point.wageIncrease,
    });
  };

  const hideTooltip = () => {
    setHoveredIndex(null);
    setTooltipData(null);
  };

  const renderDot = (props: {
    cx?: number;
    cy?: number;
    index?: number;
  }) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return null;

    const icon = basketTypesIcons?.basketIcon ?? "🛒";

    return (
      <ChartDot
        id={`axis-dot-${data[index]?.year ?? index}`}
        cx={cx}
        cy={cy}
        icon={icon}
        iconSrc={dieesseIcon.src}
        color={SERIES_COLORS.dieese}
        hoverColor={SERIES_COLORS.dieese}
        isHovered={hoveredIndex === index}
        onMouseEnter={() => showTooltip(index, cx, cy)}
        onMouseLeave={hideTooltip}
        onClick={() => showTooltip(index, cx, cy)}
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
      />
    );
  };

  if (!data || data.length === 0) {
    return <ChartLoading />;
  }

  return (
    <div id="axis-graph" className="relative w-full">
      <div className="flex flex-col items-center text-center mb-10">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-card-summary)", color: "#A89B8C" }}
        >
          Gráfico de Inflação Acumulada
        </span>
        <h2
          className="text-4xl sm:text-4xl font-bold tracking-tight text-center mt-1"
          style={{
            fontFamily: "var(--font-subheader)",
            color: "#1A120B",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          DIEESE<br />×<br />IPCA
        </h2>
      </div>
      <MetricsLegend
        containerId="axis-subtitles"
        metrics={[
          {
            id: "axis-subtitle-dieese",
            label: "DIEESE",
            color: SERIES_COLORS.dieese,
          },
          {
            id: "axis-subtitle-salario",
            label: "SALÁRIO",
            color: SERIES_COLORS.wageIncrease,
          },
          {
            id: "axis-subtitle-ipca",
            label: "IPCA",
            color: SERIES_COLORS.ipca,
          },
        ]}
      />
      <div
        id="axis-graph-chart"
        className={`relative w-full ${surfaceStyles.chartNoSelect}`}
        style={{ height: "clamp(420px, 60vh, 640px)" }}
        aria-label="Gráfico de inflação anual"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient
                id="inflationGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={SERIES_COLORS.dieese} stopOpacity={0.15} />
                <stop offset="95%" stopColor={SERIES_COLORS.dieese} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid {...GRID_PROPS} />

            <XAxis {...X_AXIS_PROPS} />

            <YAxis
              {...Y_AXIS_PROPS}
              domain={[
                0,
                (dataMax: number) => Math.ceil((dataMax * 1.12) / 5) * 5,
              ]}
            />

            <Area
              yAxisId="pct"
              type="monotone"
              dataKey="inflation"
              stroke="none"
              fill="url(#inflationGradient)"
              isAnimationActive={false}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="inflation"
              stroke={SERIES_COLORS.dieese}
              strokeWidth={3}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="ipca"
              stroke={SERIES_COLORS.ipca}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={true}
              activeDot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="wageIncrease"
              stroke={SERIES_COLORS.wageIncrease}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={true}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {tooltipData && (
          <ChartTooltip
            x={tooltipData.x}
            y={tooltipData.y + 10}
            inflation={tooltipData.inflation}
            ipca={tooltipData.ipca}
            ipcaPartialLabel={tooltipData.ipcaPartialLabel}
            wageIncrease={tooltipData.wageIncrease}
            basePrice={basePrice}
            baseSalary={baseSalary}
            side={
              tooltipData.index === data.length - 1
                ? "left"
                : tooltipData.y > 250
                  ? "right"
                  : "below"
            }
            visible={true}
            onRequestClose={hideTooltip}
          />
        )}
      </div>
    </div>
  );
}
