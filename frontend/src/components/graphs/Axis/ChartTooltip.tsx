import React, { useEffect, useRef, useState } from "react";
import styles from "./ChartTooltip.module.css";

interface ChartTooltipProps {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
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

  const DOT_RADIUS = 20;
  const GAP = 6;
  const TOOLTIP_HEIGHT = 80;

  const positionStyle =
    side === "right"
      ? { left: x + DOT_RADIUS + GAP, top: y, transform: "translateY(-50%)" }
      : side === "left"
      ? { left: x - DOT_RADIUS - GAP, top: y, transform: "translate(-100%, -50%)" }
      : { left: clampedX, top: y + DOT_RADIUS + GAP, transform: "translate(-50%, 0)" };

  return (
    <div
      ref={tooltipRef}
      className={`${styles.tooltip} ${side === "right" ? styles.tooltipRight : side === "left" ? styles.tooltipLeft : ""}`}
      style={positionStyle}
    >
      <div className={styles.metric} style={{ color: "#e0aa59" }}>
        <span className={styles.label}>INFLAÇÃO</span>
        <span className={styles.value}>{formatValue(inflation)}</span>
      </div>
      <div className={styles.metric} style={{ color: "#b300ff" }}>
        <span className={styles.label}>IPCA</span>
        <span className={styles.value}>{formatValue(ipca)}</span>
      </div>
      <div className={styles.metric} style={{ color: "#2563eb" }}>
        <span className={styles.label}>SALÁRIO</span>
        <span className={styles.value}>{formatValue(wageIncrease)}</span>
      </div>
    </div>
  );
};