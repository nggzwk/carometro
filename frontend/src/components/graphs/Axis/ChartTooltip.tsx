import React, { useEffect, useRef, useState } from "react";
import styles from "./ChartTooltip.module.css";
import { SERIES_COLORS } from "../shared/chartTheme";
import { formatBrlFromBase } from "../../../lib/formatters";
import {
  ChartTooltipRow,
  type TooltipMetric,
} from "../shared/ChartTooltipRow";

interface ChartTooltipProps {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  ipcaPartialLabel?: string | null;
  wageIncrease: number | null;
  wagePartialLabel?: string | null;
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
  wagePartialLabel = null,
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

  const DOT_RADIUS = 20;
  const GAP = 6;

  const positionStyle =
    side === "right"
      ? { left: x + DOT_RADIUS + GAP, top: y, transform: "translateY(-50%)" }
      : side === "left"
      ? { left: x - DOT_RADIUS - GAP, top: y, transform: "translate(-100%, -50%)" }
      : { left: clampedX, top: y + DOT_RADIUS + GAP, transform: "translate(-50%, 0)" };

  const metrics: TooltipMetric[] = [
    {
      key: "inflation",
      color: SERIES_COLORS.inflation,
      value: inflation,
      brl: formatBrlFromBase(inflation, basePrice),
    },
    {
      key: "wageIncrease",
      color: SERIES_COLORS.wageIncrease,
      value: wageIncrease,
      partialLabel: wagePartialLabel,
      brl: formatBrlFromBase(wageIncrease, baseSalary),
    },
    {
      key: "ipca",
      color: SERIES_COLORS.ipca,
      value: ipca,
      partialLabel: ipcaPartialLabel,
    },
  ];

  return (
    <div
      id="chart-tooltip"
      ref={tooltipRef}
      className={`${styles.tooltipAnchor} ${side === "right" ? styles.tooltipRight : side === "left" ? styles.tooltipLeft : ""}`}
      style={positionStyle}
    >
      <div className={styles.tooltip}>
        {metrics.map((metric) => (
          <ChartTooltipRow key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
};
