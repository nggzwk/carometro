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
import { SERIES_COLORS } from "../../../lib/chartColors";
import styles from "./LineGraph.module.css";
import axisStyles from "../Axis/AxisGraph.module.css";

type LineGraphChartProps = {
  series: ItemLineSeries[];
  ipcaByYear?: Record<number, number>;
  ipcaPartial?: { year: number; label: string } | null;
};

type TooltipData = {
  x: number;
  y: number;
  pct: number | null;
  priceBrl: number | null;
  ipca: number | null;
  ipcaPartialLabel: string | null;
};

export default function LineGraphChart({
  series,
  ipcaByYear = {},
  ipcaPartial = null,
}: LineGraphChartProps) {
  const selectableItems = series.filter((s) => s.points.length > 0);

  const [selectedSubcat, setSelectedSubcat] = useState<number | null>(
    selectableItems[0]?.subcategoria ?? null,
  );
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

  const chartData = data.map((p, i) => {
    let factor = 1;
    for (let j = 0; j <= i; j++) {
      const annual = ipcaByYear[Number(data[j].year)];
      if (annual != null) factor *= 1 + annual / 100;
    }
    return { ...p, ipca: Number(((factor - 1) * 100).toFixed(2)) };
  });

  const handleSelect = (subcategoria: number) => {
    setSelectedSubcat((prev) => (prev === subcategoria ? null : subcategoria));
    setTooltip(null);
  };

  const showTooltip = useCallback((index: number, cx: number, cy: number) => {
    const point = chartData[index];
    if (!point) return;
    const isPartial = ipcaPartial != null && Number(point.year) === ipcaPartial.year;
    setTooltip({
      x: cx,
      y: cy,
      pct: point.value,
      priceBrl: point.priceBrl,
      ipca: point.ipca,
      ipcaPartialLabel: isPartial ? ipcaPartial.label : null,
    });
  }, [chartData, ipcaPartial]);

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
        onMouseEnter={() => showTooltip(index, cx, cy)}
        onMouseLeave={() => setTooltip(null)}
        onClick={() => showTooltip(index, cx, cy)}
      />
    );
  }, [data, color, selectedSubcat, showTooltip]);

  if (selectableItems.length === 0) {
    return (
      <div className={axisStyles.loading}>
        <div className={axisStyles.spinner}></div>
        <p>Carregando dados...</p>
      </div>
    );
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
        <h2
          id="line-graph-title"
          className="text-4xl sm:text-4xl font-bold tracking-tight text-center"
          style={{
            fontFamily: "var(--font-subheader)",
            color: "#1A120B",
            letterSpacing: "-0.01em",
          }}
        >
          BASICÃO
        </h2>
      </div>

      <div
        id="line-graph-ipca-legend"
        className={`${axisStyles.metricsSubtitle} flex gap-6 mb-6 flex-wrap`}
      >
        <div id="line-subtitle-ipca" className={axisStyles.metricsSubtitleItem}>
          <span
            className={axisStyles.metricsSubtitleSquare}
            style={{ backgroundColor: SERIES_COLORS.ipca }}
            aria-hidden="true"
          />
          <span className={axisStyles.metricsSubtitleLabel}>IPCA</span>
        </div>
      </div>

      <div
        id="line-graph-chart"
        className={`relative w-full ${axisStyles.chartNoSelect}`}
        aria-label="Gráfico de preço acumulado por item do basicão"
      >
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 5, bottom: 20 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
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
              domain={[
                (dataMin: number) =>
                  dataMin >= 0 ? 0 : Math.floor((dataMin * 1.12) / 5) * 5,
                (dataMax: number) =>
                  dataMax <= 0 ? 0 : Math.ceil((dataMax * 1.12) / 5) * 5,
              ]}
              axisLine={{ stroke: "#d4c4b0", strokeWidth: 1.5 }}
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
            <div className={styles.tooltipMetric}>
              <span
                className={styles.tooltipSquare}
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <div className={styles.tooltipValues}>
                <span className={styles.tooltipPct}>
                  {tooltip.pct == null
                    ? "—"
                    : `${tooltip.pct > 0 ? "+" : ""}${tooltip.pct.toFixed(2)}%`}
                </span>
                <span className={styles.tooltipBrl}>
                  {tooltip.priceBrl == null
                    ? "—"
                    : tooltip.priceBrl.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </span>
              </div>
            </div>
            <div className={styles.tooltipMetric}>
              <span
                className={styles.tooltipSquare}
                style={{ backgroundColor: SERIES_COLORS.ipca }}
                aria-hidden="true"
              />
              <div className={styles.tooltipValues}>
                <span className={styles.tooltipPct}>
                  {tooltip.ipca == null
                    ? "—"
                    : `${tooltip.ipca > 0 ? "+" : ""}${tooltip.ipca.toFixed(2)}%`}
                </span>
                {tooltip.ipcaPartialLabel && (
                  <span className={styles.tooltipIpcaPartial}>
                    {tooltip.ipcaPartialLabel}
                  </span>
                )}
              </div>
            </div>
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
              title={getBasketItemName(item.subcategoria)}
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
