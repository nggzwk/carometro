"use client";

import { motion } from "framer-motion";

const ACCENT = "#A89B8C";

interface ChangeMenuProps {
  onClick: () => void;
  variant?: "default" | "icon";
  label?: string;
}

export default function ChangeMenu({ onClick, variant = "default", label = "Menu" }: ChangeMenuProps) {
  if (variant === "icon") {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.90 }}
        animate={{
          boxShadow: [
            "0 0 0px 0px rgba(168,155,140,0.0)",
            "0 0 7px 2px rgba(168,155,140,0.30)",
            "0 0 0px 0px rgba(168,155,140,0.0)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center cursor-pointer select-none"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.10)",
          backgroundColor: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(10px)",
          color: "#1A120B",
          fontSize: 9,
          letterSpacing: "0.02em",
        }}
      >
        ▶
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 cursor-pointer select-none pb-px"
      style={{ borderBottom: `1px solid ${ACCENT}55` }}
    >
      <span
        className="uppercase whitespace-nowrap"
        style={{
          fontFamily: "var(--font-card-summary)",
          color: ACCENT,
          fontSize: "0.7rem",
          letterSpacing: "0.14em",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span style={{ color: "#1A120B", fontSize: 8 }}>▶</span>
    </motion.button>
  );
}
