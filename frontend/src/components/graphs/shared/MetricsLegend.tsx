import React from "react";
import styles from "./MetricsLegend.module.css";

export type LegendMetric = {
  id: string;
  label: string;
  color: string;
};

type MetricsLegendProps = {
  containerId: string;
  metrics: LegendMetric[];
};

export function MetricsLegend({ containerId, metrics }: MetricsLegendProps) {
  return (
    <div
      id={containerId}
      className={`${styles.metricsSubtitle} flex gap-6 mb-6 flex-wrap`}
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          id={metric.id}
          className={styles.metricsSubtitleItem}
        >
          <span
            className={styles.metricsSubtitleSquare}
            style={{ backgroundColor: metric.color }}
            aria-hidden="true"
          />
          <span className={styles.metricsSubtitleLabel}>{metric.label}</span>
        </div>
      ))}
    </div>
  );
}
