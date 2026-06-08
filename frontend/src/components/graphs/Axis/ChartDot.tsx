import React from "react";
import styles from "./ChartDot.module.css";

interface ChartDotProps {
  cx: number;
  cy: number;
  icon: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  id?: string;
}

export const ChartDot: React.FC<ChartDotProps> = ({
  cx,
  cy,
  icon,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onPointerDown,
  id,
}) => {
  if (cx == null || cy == null) return null;

  const baseR = isHovered ? 19.2 : 16;
  
  return (
    <g
      id={id}
      className={styles.dotGroup}
      transform={`translate(${cx}, ${cy})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {isHovered && (
        <circle
          cx={0}
          cy={0}
          r={baseR + 8}
          fill="none"
          stroke="#eabf7e"
          strokeWidth={2}
          opacity={0.3}
          className={styles.glowRing}
        />
      )}
      
      <circle
        cx={0}
        cy={0}
        r={baseR}
        fill="#ffffff"
        stroke={isHovered ? "#eabf7e" : "#e0aa59"}
        strokeWidth={isHovered ? 2.5 : 1.5}
        className={isHovered ? styles.hoveredCircle : styles.circle}
        style={{
          transition: "r 300ms cubic-bezier(0.4, 0, 0.2, 1), stroke 300ms, stroke-width 300ms",
        }}
      />
      
      <text
        x={0}
        y={isHovered ? 7 : 6}
        textAnchor="middle"
        fontSize={isHovered ? 18 : 16}
        pointerEvents="none"
        className={styles.icon}
        style={{
          transition: "font-size 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {icon}
      </text>
    </g>
  );
};