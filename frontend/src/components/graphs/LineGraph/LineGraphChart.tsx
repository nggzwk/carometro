"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ReferenceLine,
} from "recharts";
import {
  getBasketItemIcon,
  getBasketItemName,
  getBasketItemColor,
} from "../../../lib/basketIcons";
import type { ItemLineSeries } from "../../../lib/itemLines";
import { ChartDot } from "../Axis/ChartDot";
import { formatBrlFromBase, formatBrlValue } from "../../../lib/formatters";
import {
  SERIES_COLORS,
  CHART_MARGIN,
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
} from "../shared/chartTheme";
import {
  ChartTooltipRow,
  type TooltipMetric,
} from "../shared/ChartTooltipRow";
import { MetricsLegend } from "../shared/MetricsLegend";
import { ChartLoading } from "../shared/ChartLoading";
import styles from "./LineGraph.module.css";
import surfaceStyles from "../shared/chartSurface.module.css";

type Menu = "basicao" | "feirao";

const MENU_LABELS: Record<Menu, string> = {
  basicao: "BASICÃO",
  feirao: "FEIRÃO",
};

type LineGraphChartProps = {
  series: ItemLineSeries[];
  feiraoSeries?: ItemLineSeries[];
  ipcaByYear?: Record<number, number>;
  ipcaPartial?: { year: number; label: string } | null;
  wageByYear?: Record<number, number | null>;
  baseSalary?: number;
};

type TooltipData = {
  x: number;
  y: number;
  pct: number | null;
  priceBrl: number | null;
  ipca: number | null;
  ipcaPartialLabel: string | null;
  wageIncrease: number | null;
  wagePartialLabel: string | null;
};

export default function LineGraphChart({
  series,
  feiraoSeries = [],
  ipcaByYear = {},
  ipcaPartial = null,
  wageByYear = {},
  baseSalary = 0,
}: LineGraphChartProps) {
  const [menu, setMenu] = useState<Menu>("basicao");
  const activeSeries = menu === "basicao" ? series : feiraoSeries;
  const selectableItems = activeSeries.filter((s) => s.points.length > 0);

  const [selectedSubcat, setSelectedSubcat] = useState<number | null>(
    selectableItems[0]?.subcategoria ?? null,
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    arrowLeft: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    const parent = el?.parentElement;
    if (!tooltip || !el || !parent) {
      setTooltipPos(null);
      return;
    }
    const width = el.offsetWidth;
    const parentWidth = parent.clientWidth;
    const pad = 8;
    const minCenter = pad + width / 2;
    const maxCenter = parentWidth - pad - width / 2;
    const center =
      minCenter > maxCenter
        ? parentWidth / 2
        : Math.min(Math.max(tooltip.x, minCenter), maxCenter);
    const arrowLeft = Math.min(
      Math.max(tooltip.x - (center - width / 2), 16),
      width - 16,
    );
    setTooltipPos({ left: center, arrowLeft });
  }, [tooltip]);

  const selected =
    selectableItems.find((s) => s.subcategoria === selectedSubcat) ?? null;
  const data = selected?.points ?? [];
  const color = selectedSubcat != null ? getBasketItemColor(selectedSubcat) : "#e0aa59";

  const baseHasWage =
    data.length > 0 && wageByYear[Number(data[0].year)] != null;

  const chartData = data.map((p, i) => {
    let ipcaFactor = 1;
    let wageFactor = 1;
    for (let j = 1; j <= i; j++) {
      const year = Number(data[j].year);
      const annualIpca = ipcaByYear[year];
      if (annualIpca != null) ipcaFactor *= 1 + annualIpca / 100;
      const annualWage = wageByYear[year];
      if (annualWage != null) wageFactor *= 1 + annualWage / 100;
    }
    return {
      ...p,
      ipca: Number(((ipcaFactor - 1) * 100).toFixed(2)),
      wageIncrease: baseHasWage
        ? Number(((wageFactor - 1) * 100).toFixed(2))
        : null,
      wagePartialLabel: i === 0 && baseHasWage ? "início do cálculo" : null,
    };
  });

  const handleSelect = (subcategoria: number) => {
    setSelectedSubcat((prev) => (prev === subcategoria ? null : subcategoria));
    setHoveredIndex(null);
    setTooltip(null);
  };

  const toggleMenu = () => {
    const next: Menu = menu === "basicao" ? "feirao" : "basicao";
    const nextSeries = next === "basicao" ? series : feiraoSeries;
    const firstSelectable = nextSeries.find((s) => s.points.length > 0);
    setMenu(next);
    setSelectedSubcat(firstSelectable?.subcategoria ?? null);
    setHoveredIndex(null);
    setTooltip(null);
  };

  const showTooltip = useCallback((index: number, cx: number, cy: number) => {
    const point = chartData[index];
    if (!point) return;
    const isPartial = ipcaPartial != null && Number(point.year) === ipcaPartial.year;
    setHoveredIndex(index);
    setTooltip({
      x: cx,
      y: cy,
      pct: point.value,
      priceBrl: point.priceBrl,
      ipca: point.ipca,
      ipcaPartialLabel: isPartial ? ipcaPartial.label : null,
      wageIncrease: point.wageIncrease,
      wagePartialLabel: point.wagePartialLabel,
    });
  }, [chartData, ipcaPartial]);

  const hideTooltip = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, []);

  const renderDot = useCallback((props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null || selectedSubcat == null)
      return null;

    const point = data[index];
    if (!point || point.value == null) return null;

    return (
      <ChartDot
        id={`line-dot-${point.year}`}
        cx={cx}
        cy={cy}
        icon={getBasketItemIcon(selectedSubcat)}
        color={color}
        hoverColor={color}
        isHovered={hoveredIndex === index}
        onMouseEnter={() => showTooltip(index, cx, cy)}
        onMouseLeave={hideTooltip}
        onClick={() => showTooltip(index, cx, cy)}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }, [data, color, selectedSubcat, hoveredIndex, showTooltip, hideTooltip]);

  const hasAnyData =
    series.some((s) => s.points.length > 0) ||
    feiraoSeries.some((s) => s.points.length > 0);

  if (!hasAnyData) {
    return <ChartLoading />;
  }

  return (
    <div id="line-graph" className="relative w-full">
      <div className="flex flex-col items-center mb-8">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 mb-2"
          style={{ backgroundColor: "#ffffff", color: "#A89B8C" }}
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ fontFamily: "var(--font-card-summary)" }}
          >
            Gráfico de inflação acumulada
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            id="line-graph-prev"
            onClick={toggleMenu}
            aria-label="Cesta anterior"
            className={styles.menuArrow}
          >
            ◀
          </button>
          <h2
            id="line-graph-title"
            className="text-4xl sm:text-4xl font-bold tracking-tight text-center"
            style={{
              fontFamily: "var(--font-subheader)",
              color: "#1A120B",
              letterSpacing: "-0.01em",
              minWidth: "5.5ch",
            }}
          >
            {MENU_LABELS[menu]}
          </h2>
          <button
            type="button"
            id="line-graph-next"
            onClick={toggleMenu}
            aria-label="Próxima cesta"
            className={styles.menuArrow}
          >
            ▶
          </button>
        </div>
      </div>

      <MetricsLegend
        containerId="line-graph-ipca-legend"
        metrics={[
          {
            id: "line-subtitle-salario",
            label: "SALÁRIO",
            color: SERIES_COLORS.wageIncrease,
          },
          {
            id: "line-subtitle-ipca",
            label: "IPCA",
            color: SERIES_COLORS.ipca,
          },
        ]}
      />

      <div
        id="line-graph-chart"
        className={`relative w-full ${surfaceStyles.chartNoSelect}`}
        aria-label="Gráfico de preço acumulado por item do basicão"
        onPointerDown={hideTooltip}
      >
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid {...GRID_PROPS} />

            <XAxis {...X_AXIS_PROPS} />

            <YAxis
              {...Y_AXIS_PROPS}
              domain={[
                (dataMin: number) =>
                  dataMin >= 0 ? 0 : Math.floor((dataMin * 1.12) / 5) * 5,
                (dataMax: number) =>
                  dataMax <= 0 ? 0 : Math.ceil((dataMax * 1.12) / 5) * 5,
              ]}
            />

            <ReferenceLine
              yAxisId="pct"
              y={0}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            <Area
              yAxisId="pct"
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#lineGradient)"
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
              activeDot={false}
              connectNulls={true}
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
              activeDot={false}
              connectNulls={true}
              isAnimationActive={false}
            />

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={renderDot}
              activeDot={false}
              connectNulls={true}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {tooltip && (
          <div
            id="line-graph-tooltip"
            ref={tooltipRef}
            className={styles.tooltip}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              left: tooltipPos ? tooltipPos.left : tooltip.x,
              top: tooltip.y + 28,
              transform: "translateX(-50%)",
              visibility: tooltipPos ? "visible" : "hidden",
            }}
          >
            <span
              className={styles.tooltipArrow}
              style={tooltipPos ? { left: tooltipPos.arrowLeft } : undefined}
              aria-hidden="true"
            />
            {(
              [
                {
                  key: "item",
                  color,
                  value: tooltip.pct,
                  brl: formatBrlValue(tooltip.priceBrl),
                },
                {
                  key: "wageIncrease",
                  color: SERIES_COLORS.wageIncrease,
                  value: tooltip.wageIncrease,
                  partialLabel: tooltip.wagePartialLabel,
                  brl: formatBrlFromBase(tooltip.wageIncrease, baseSalary),
                },
                {
                  key: "ipca",
                  color: SERIES_COLORS.ipca,
                  value: tooltip.ipca,
                  partialLabel: tooltip.ipcaPartialLabel,
                },
              ] satisfies TooltipMetric[]
            ).map((metric) => (
              <ChartTooltipRow
                key={metric.key}
                metric={metric}
                idPrefix="line-tooltip"
              />
            ))}
          </div>
        )}
      </div>

      <div
        id="line-graph-legend"
        className={styles.legend}
      >
        {selectableItems.map((item) => {
          const isActive = item.subcategoria === selectedSubcat;
          const itemColor = getBasketItemColor(item.subcategoria);
          return (
            <button
              key={item.subcategoria}
              type="button"
              id={`line-legend-${item.subcategoria}`}
              className={`${styles.legendItem} ${isActive ? styles.legendItemActive : ""}`}
              onClick={() => handleSelect(item.subcategoria)}
              aria-pressed={isActive}
              aria-label={getBasketItemName(item.subcategoria)}
              style={isActive ? { borderColor: itemColor } : undefined}
            >
              <span className={styles.legendIcon} aria-hidden="true">
                {getBasketItemIcon(item.subcategoria)}
              </span>
              <span className={styles.legendLabel}>
                {getBasketItemName(item.subcategoria)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
