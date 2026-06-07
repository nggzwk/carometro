import React, { useEffect, useRef, useState } from "react";
import styles from "./ChartTooltip.module.css";

interface ChartTooltipProps {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
  basePrice: number;
  visible: boolean;
  side?: "below" | "right" | "left";
  onRequestClose: () => void;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  inflation,
  ipca,
  wageIncrease,
  basePrice,
  visible,
  side = "below",
  onRequestClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [clampedX, setClampedX] = useState<number>(x);
  const [expandedMetric, setExpandedMetric] = useState<"inflation" | "ipca" | "wageIncrease" | null>(null);

  useEffect(() => {
    setExpandedMetric(null);
  }, [x, y]);

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

  const formatBRL = (value: number | null) => {
    if (value === null || basePrice === 0) return null;
    const brl = basePrice * (1 + value / 100);
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
    { key: "inflation", color: "#e0aa59", value: inflation },
    { key: "wageIncrease", color: "#2563eb", value: wageIncrease },
    { key: "ipca", color: "#b300ff", value: ipca },
  ];

  return (
    <div
      ref={tooltipRef}
      className={`${styles.tooltipAnchor} ${side === "right" ? styles.tooltipRight : side === "left" ? styles.tooltipLeft : ""}`}
      style={positionStyle}
    >
      <div className={styles.tooltip}>
        {metrics.map(({ key, color, value }) => {
          const brl = key !== "ipca" ? formatBRL(value) : null;
          const isExpanded = expandedMetric === key;
          return (
            <div
              key={key}
              className={`${styles.metric} ${brl ? styles.metricClickable : ""}`}
              style={{ color }}
              onClick={brl ? () => setExpandedMetric(isExpanded ? null : key) : undefined}
            >
              <span className={styles.square} style={{ backgroundColor: color }} />
              <div className={styles.metricValues}>
                <span className={styles.value}>{formatValue(value)}</span>
                {isExpanded && brl && (
                  <span className={styles.brlValue}>{brl}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
