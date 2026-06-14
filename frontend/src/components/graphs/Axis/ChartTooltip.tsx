import React, { useEffect, useRef, useState } from "react";
import styles from "./ChartTooltip.module.css";
import { SERIES_COLORS } from "../../../lib/chartColors";

interface ChartTooltipProps {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  ipcaPartialLabel?: string | null;
  wageIncrease: number | null;
  basePrice: number;
  baseSalary?: number;
  visible: boolean;
  side?: "below" | "right" | "left";
  onRequestClose: () => void;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  inflation,
  ipca,
  ipcaPartialLabel = null,
  wageIncrease,
  basePrice,
  baseSalary = 0,
  visible,
  side = "below",
  onRequestClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [clampedX, setClampedX] = useState<number>(x);

  useEffect(() => {
    if (!visible) return;

    const handlePointerDown = (event: PointerEvent) => {
      const tooltipEl = tooltipRef.current;
      const target = event.target as Node | null;
      if (!tooltipEl || !target) return;

      if (!tooltipEl.contains(target)) {
        onRequestClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [visible, onRequestClose]);

  useEffect(() => {
    if (!visible) return;

    const tooltipEl = tooltipRef.current;
    const parentEl = tooltipEl?.parentElement;
    if (!tooltipEl || !parentEl) {
      setClampedX(x);
      return;
    }

    const tooltipWidth = tooltipEl.offsetWidth;
    const parentWidth = parentEl.clientWidth;
    const edgePadding = 8;

    const minCenter = edgePadding + tooltipWidth / 2;
    const maxCenter = parentWidth - edgePadding - tooltipWidth / 2;

    if (minCenter > maxCenter) {
      setClampedX(parentWidth / 2);
      return;
    }

    setClampedX(Math.min(Math.max(x, minCenter), maxCenter));
  }, [x, visible, inflation, ipca, wageIncrease]);

  if (!visible) return null;

  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    if (value > 0) return `+${value.toFixed(2)}%`;
    if (value < 0) return `${value.toFixed(2)}%`;
    return `0.00%`;
  };

  const formatBRL = (value: number | null, base: number) => {
    if (value === null || base === 0) return null;
    const brl = base * (1 + value / 100);
    return brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const DOT_RADIUS = 20;
  const GAP = 6;

  const positionStyle =
    side === "right"
      ? { left: x + DOT_RADIUS + GAP, top: y, transform: "translateY(-50%)" }
      : side === "left"
      ? { left: x - DOT_RADIUS - GAP, top: y, transform: "translate(-100%, -50%)" }
      : { left: clampedX, top: y + DOT_RADIUS + GAP, transform: "translate(-50%, 0)" };

  const metrics: { key: "inflation" | "ipca" | "wageIncrease"; color: string; value: number | null }[] = [
    { key: "inflation", color: SERIES_COLORS.inflation, value: inflation },
    { key: "wageIncrease", color: SERIES_COLORS.wageIncrease, value: wageIncrease },
    { key: "ipca", color: SERIES_COLORS.ipca, value: ipca },
  ];

  return (
    <div
      id="chart-tooltip"
      ref={tooltipRef}
      className={`${styles.tooltipAnchor} ${side === "right" ? styles.tooltipRight : side === "left" ? styles.tooltipLeft : ""}`}
      style={positionStyle}
    >
      <div className={styles.tooltip}>
        {metrics.map(({ key, color, value }) => {
          const brl = key === "inflation"
            ? formatBRL(value, basePrice)
            : key === "wageIncrease"
            ? formatBRL(value, baseSalary)
            : null;
          return (
            <div
              id={`chart-tooltip-${key}`}
              key={key}
              className={`${styles.metric} ${key === "ipca" && ipcaPartialLabel ? styles.metricPartial : ""}`}
              style={{ color }}
            >
              <span className={styles.square} style={{ backgroundColor: color }} />
              <div className={styles.metricValues}>
                <span id={`chart-tooltip-${key}-value`} className={styles.value}>{formatValue(value)}</span>
                {key === "ipca" && ipcaPartialLabel && (
                  <span
                    id="chart-tooltip-ipca-partial"
                    className={styles.partialLabel}
                  >
                    {ipcaPartialLabel}
                  </span>
                )}
                {brl && (
                  <span id={`chart-tooltip-${key}-brl`} className={styles.brlValue}>{brl}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
