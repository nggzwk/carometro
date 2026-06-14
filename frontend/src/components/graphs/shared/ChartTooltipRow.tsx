import React from "react";
import styles from "./ChartTooltipRow.module.css";
import { formatSignedPct } from "../../../lib/formatters";

export type TooltipMetric = {
  key: string;
  color: string;
  value: number | null;
  brl?: string | null;
  partialLabel?: string | null;
};

type ChartTooltipRowProps = {
  metric: TooltipMetric;
  idPrefix?: string;
};

export const ChartTooltipRow: React.FC<ChartTooltipRowProps> = ({
  metric,
  idPrefix = "chart-tooltip",
}) => {
  const { key, color, value, brl, partialLabel } = metric;
  return (
    <div
      id={`${idPrefix}-${key}`}
      className={`${styles.metric} ${partialLabel ? styles.metricPartial : ""}`}
      style={{ color }}
    >
      <span
        className={styles.square}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className={styles.metricValues}>
        <span id={`${idPrefix}-${key}-value`} className={styles.value}>
          {formatSignedPct(value)}
        </span>
        {partialLabel && (
          <span id={`${idPrefix}-${key}-partial`} className={styles.partialLabel}>
            {partialLabel}
          </span>
        )}
        {brl && (
          <span id={`${idPrefix}-${key}-brl`} className={styles.brlValue}>
            {brl}
          </span>
        )}
      </div>
    </div>
  );
};
