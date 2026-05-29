"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Area,
} from "recharts";
import getAnnualInflation from "../../../lib/annualInflation";
import { basketTypesIcons } from "../../../lib/basketIcons";
import { ChartDot } from "./ChartDot";
import { ChartTooltip } from "./ChartTooltip";
import styles from "./AxisGraph.module.css";

type DataPoint = {
  year: string;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
};

type TooltipData = {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
};

export default function AxisGraph() {
  const metricsSubtitle = [
    { label: "INFLAÇÃO", color: "#e0aa59" },
    { label: "IPCA", color: "#b300ff" },
    { label: "SALÁRIO", color: "#2563eb" },
  ] as const;

  const tooltipMarginFromIcon = 26;
  const [data, setData] = useState<DataPoint[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rows = await getAnnualInflation();
      if (!rows || !mounted) return;
      const series = rows.map((r) => ({
        year: String(r.year),
        inflation:
          r.annual_inflation_pct === null
            ? null
            : Number(r.annual_inflation_pct),
        ipca: r.annual_ipca_pct === null ? null : Number(r.annual_ipca_pct),
        wageIncrease:
          (r as any).annual_minimum_wage_increase_pct === null ||
          (r as any).annual_minimum_wage_increase_pct === undefined
            ? null
            : Number((r as any).annual_minimum_wage_increase_pct),
      }));
      setData(series);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDotInteraction = (index: number, cx: number, cy: number) => {
    setHoveredIndex(index);

    const point = data[index];
    if (!point) return;

    setTooltipData({
      x: cx,
      y: cy,
      inflation: point.inflation,
      ipca: point.ipca,
      wageIncrease: point.wageIncrease,
    });
  };

  const handleDotLeave = () => {
    setHoveredIndex(null);
    setTooltipData(null);
  };

  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return null;

    const icon = basketTypesIcons?.basketIcon ?? "🛒";

    return (
      <ChartDot
        cx={cx}
        cy={cy}
        icon={icon}
        isHovered={hoveredIndex === index}
        onMouseEnter={() => handleDotInteraction(index, cx, cy)}
        onMouseLeave={handleDotLeave}
        onClick={() => handleDotInteraction(index, cx, cy)}
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
    <div className={`${styles.container} relative`}>
      <h1
        className={`${styles.title} relative mb-4 flex w-full items-start justify-center text-3xl sm:text-4xl font-bold tracking-tight`}
        style={{
          fontFamily: "var(--font-header)",
          color: "#1A120B",
          letterSpacing: "-0.01em",
        }}
      >
        <span className="relative inline-flex items-center">Inflação Anual vs IPCA</span>
      </h1>
      <div className={styles.metricsSubtitle}>
        {metricsSubtitle.map((metric) => (
          <div key={metric.label} className={styles.metricsSubtitleItem}>
            <span
              className={styles.metricsSubtitleSquare}
              style={{ backgroundColor: metric.color }}
              aria-hidden="true"
            />
            <span className={styles.metricsSubtitleLabel}>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className={`${styles.chartWrapper} ${styles.chartNoSelect}`} aria-label="Gráfico de inflação anual">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
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
              tick={{ fill: "#8B7355", fontSize: 13 }}
              tickMargin={10}
              axisLine={{ stroke: "#d4c4b0", strokeWidth: 1.5 }}
            />

            <YAxis
              stroke="#8B7355"
              tick={{ fill: "#8B7355", fontSize: 13 }}
              tickFormatter={(v) => `${v}%`}
              width={60}
              tickMargin={8}
              axisLine={{ stroke: "#d4c4b0", strokeWidth: 1.5 }}
            />

            <ReferenceLine
              y={0}
              stroke="#8B7355"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: "0%",
                position: "left",
                fill: "#8B7355",
                fontSize: 11,
              }}
            />

            <Area
              type="monotone"
              dataKey="inflation"
              stroke="none"
              fill="url(#inflationGradient)"
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="inflation"
              stroke="#e0aa59"
              strokeWidth={3}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />

            <Line
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
            y={tooltipData.y + tooltipMarginFromIcon}
            inflation={tooltipData.inflation}
            ipca={tooltipData.ipca}
            wageIncrease={tooltipData.wageIncrease}
            visible={true}
            onRequestClose={handleDotLeave}
          />
        )}
      </div>
    </div>
  );
}
