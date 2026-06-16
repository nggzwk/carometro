"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "./constants";
import "./ItemsCircle.css";

interface ItemsCircleProps {
  icon: string;
  label?: string;
  delay?: number;
  onClick: () => void;
}

export default function ItemsCircle({
  icon,
  label,
  delay = 0,
  onClick,
}: ItemsCircleProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: EASE_OUT }}
      whileHover={{ scale: 1.18 }}
      whileTap={{ scale: 0.82 }}
      className="custom-item-circle"
      aria-label={label ? `Adicionar ${label} à cesta` : "Adicionar item à cesta"}
      title={label}
    >
      <span className="custom-item-circle__icon">{icon}</span>
    </motion.button>
  );
}
