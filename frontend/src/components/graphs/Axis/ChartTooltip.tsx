import React, { useEffect, useRef, useState } from "react";
import styles from "./ChartTooltip.module.css";

interface ChartTooltipProps {
  x: number;
  y: number;
  inflation: number | null;
  ipca: number | null;
  wageIncrease: number | null;
  above?: boolean;
  visible: boolean;
  onRequestClose: () => void;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  inflation,
  ipca,
  wageIncrease,
  above = false,
  visible,
  onRequestClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [clampedX, setClampedX] = useState<number>(x);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsPhone(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

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
    if (!isPhone) return `${value.toFixed(2)}%`;
    if (value > 0) return `+${value.toFixed(2)}%`;
    if (value < 0) return `${value.toFixed(2)}%`;
    return `0.00%`;
  };

  const offsetY = 50;
  const phoneMarginFromIcon = 28;
  const adjustedY = above
    ? y - 60
    : y + offsetY + (isPhone ? phoneMarginFromIcon : 60);

  return (
    <div
      ref={tooltipRef}
      className={styles.tooltip}
      style={{
        left: clampedX,
        top: adjustedY,
        transform: "translate(-50%, 0)",
        ...(above && { "--arrow-top": "auto", "--arrow-bottom": "-6px", "--arrow-rotate": "225deg" } as React.CSSProperties),
      }}
    >
      <div className={`${styles.metric} ${isPhone ? styles.metricPhone : ""}`} style={{ color: "#e0aa59" }}>
        {!isPhone && <span className={styles.label}>INFLAÇÃO</span>}
        <span className={isPhone ? styles.valuePhone : styles.value}>
          {formatValue(inflation)}
        </span>
      </div>
      <div className={`${styles.metric} ${isPhone ? styles.metricPhone : ""}`} style={{ color: "#b300ff" }}>
        {!isPhone && <span className={styles.label}>IPCA</span>}
        <span className={isPhone ? styles.valuePhone : styles.value}>
          {formatValue(ipca)}
        </span>
      </div>
      <div className={`${styles.metric} ${isPhone ? styles.metricPhone : ""}`} style={{ color: "#2563eb" }}>
        {!isPhone && <span className={styles.label}>SALÁRIO</span>}
        <span className={isPhone ? styles.valuePhone : styles.value}>
          {formatValue(wageIncrease)}
        </span>
      </div>
    </div>
  );
};