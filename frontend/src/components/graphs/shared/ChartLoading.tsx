import React from "react";
import styles from "./chartSurface.module.css";

export function ChartLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Carregando dados...</p>
    </div>
  );
}
