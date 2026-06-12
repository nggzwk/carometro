import React, { useState } from "react";
import styles from "./ChartDot.module.css";

interface ChartDotProps {
  cx: number;
  cy: number;
  icon: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  id?: string;
  color?: string;
  hoverColor?: string;
  isHovered?: boolean;
}

export const ChartDot: React.FC<ChartDotProps> = ({
  cx,
  cy,
  icon,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onPointerDown,
  id,
  color = "#e0aa59",
  hoverColor = "#eabf7e",
  isHovered: isHoveredProp = false,
}) => {
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);
  const isHovered = isHoveredProp || isHoveredLocal;

  if (cx == null || cy == null) return null;

  const baseR = isHovered ? 19.2 : 16;

  const handleMouseEnter = () => {
    setIsHoveredLocal(true);
    onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsHoveredLocal(false);
    onMouseLeave();
  };

  return (
    <g
      id={id}
      className={styles.dotGroup}
      transform={`translate(${cx}, ${cy})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {isHovered && (
        <circle
          cx={0}
          cy={0}
          r={baseR + 8}
          fill="none"
          stroke={hoverColor}
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
        stroke={isHovered ? hoverColor : color}
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