"use client";

import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Menu } from "./types";

const MENU_LABELS: Record<Menu, string> = {
  basicao: "BASICÃO",
  feirao: "FEIRÃO",
};

const arrowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(255,255,255,0.8)",
  color: "#1a120b",
  fontSize: 11,
  cursor: "pointer",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

interface MenuSwitcherProps {
  menu: Menu;
  onToggle: () => void;
}

export default function MenuSwitcher({ menu, onToggle }: MenuSwitcherProps) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Menu anterior"
        style={arrowStyle}
      >
        ◀
      </button>

      <div style={{ minWidth: 100 }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={menu}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="block"
            style={{
              fontFamily: "var(--font-card-summary)",
              fontWeight: 400,
              letterSpacing: "0.14em",
              fontSize: "0.82rem",
              color: "#A89B8C",
            }}
          >
            {MENU_LABELS[menu]}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label="Próximo menu"
        style={arrowStyle}
      >
        ▶
      </button>
    </div>
  );
}
