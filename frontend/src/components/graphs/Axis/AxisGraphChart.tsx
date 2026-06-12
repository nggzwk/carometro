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
import { ChartDot } from "./ChartDot";
import { ChartTooltip } from "./ChartTooltip";
import styles from "./AxisGraph.module.css";

export type DataPoint = {
  year: string;
  value: number | null;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
};

type TooltipData = {
  x: number;
  y: number;
  index: number;
  inflation: number | null;
  ipca: number | null;
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
  const metricsSubtitle = [
    { label: "DIEESE", color: "#e0aa59" },
    { label: "SALÁRIO", color: "#2563eb" },
    { label: "IPCA", color: "#b300ff" },
  ] as const;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const handleDotInteraction = (index: number, cx: number, cy: number) => {
    setHoveredIndex(index);
    setPinnedIndex(index);

    const point = data[index];
    if (!point) return;

    setTooltipData({
      x: cx,
      y: cy,
      index,
      inflation: point.inflation,
      ipca: point.ipca,
      wageIncrease: point.wageIncrease,
    });
  };

  const handleDotLeave = () => {
    if (pinnedIndex !== null) return;
    setHoveredIndex(null);
    setTooltipData(null);
  };

  const handleDotClick = (index: number, cx: number, cy: number) => {
    if (pinnedIndex === index) {
      setPinnedIndex(null);
      setHoveredIndex(null);
      setTooltipData(null);
    } else {
      setPinnedIndex(index);
      handleDotInteraction(index, cx, cy);
    }
  };

  const handleRequestClose = () => {
    setPinnedIndex(null);
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
        isHovered={hoveredIndex === index}
        onMouseEnter={() => handleDotInteraction(index, cx, cy)}
        onMouseLeave={handleDotLeave}
        onClick={() => handleDotClick(index, cx, cy)}
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
      />
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando dados...</p>
      </div>
    );
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
          className="text-4xl sm:text-5xl font-bold tracking-tight text-center mt-1"
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
      <div
        id="axis-graph-chart"
        className={`relative w-full ${styles.chartNoSelect}`}
        style={{ height: "clamp(420px, 60vh, 640px)" }}
        aria-label="Gráfico de inflação anual"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 5, bottom: 20 }}
          >
            <defs>
              <linearGradient
                id="inflationGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#e0aa59" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#e0aa59" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#f3efe8"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="year"
              stroke="#8B7355"
              tick={{
                fill: "#8B7355",
                fontSize: 13,
                fontFamily: "var(--font-card-summary)",
              }}
              tickMargin={10}
              axisLine={{ stroke: "#d4c4b0", strokeWidth: 1.5 }}
            />

            {/* Single axis: cumulative % growth from 2023 for all three series */}
            <YAxis
              yAxisId="pct"
              stroke="#8B7355"
              tick={{
                fill: "#8B7355",
                fontSize: 13,
                fontFamily: "var(--font-card-summary)",
              }}
              tickFormatter={(v) => `${v}%`}
              width={62}
              tickMargin={4}
              domain={[0, "dataMax"]}
              axisLine={{ stroke: "#d4c4b0", strokeWidth: 1.5 }}
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
              stroke="#e0aa59"
              strokeWidth={3}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="ipca"
              stroke="#b300ff"
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
              stroke="#2563eb"
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
            onRequestClose={handleRequestClose}
          />
        )}
      </div>
      <div
        id="axis-subtitles"
        className={`${styles.metricsSubtitle} flex justify-center gap-6 mt-4 flex-wrap`}
      >
        {metricsSubtitle.map((metric) => (
          <div
            key={metric.label}
            id={`axis-subtitle-${metric.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`}
            className={styles.metricsSubtitleItem}
          >
            <span
              className={`${styles.metricsSubtitleSquare}`}
              style={{ backgroundColor: metric.color }}
              aria-hidden="true"
            />
            <span className={styles.metricsSubtitleLabel}>{metric.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
