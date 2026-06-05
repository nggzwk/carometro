"use client";

import { motion } from "framer-motion";

const ACCENT = "#A89B8C";

interface ChangeMenuProps {
  onClick: () => void;
  variant?: "default" | "icon";
}

export default function ChangeMenu({ onClick, variant = "default" }: ChangeMenuProps) {
  if (variant === "icon") {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        animate={{
          boxShadow: [
            "0 0 0px 0px rgba(168,155,140,0.0), 0 1px 6px rgba(0,0,0,0.02)",
            "0 0 8px 3px rgba(168,155,140,0.35), 0 1px 6px rgba(0,0,0,0.02)",
            "0 0 0px 0px rgba(168,155,140,0.0), 0 1px 6px rgba(0,0,0,0.03)",
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer select-none"
        style={{
          border: `1px solid ${ACCENT}30`,
          backgroundColor: "#ffffffaf",
          backdropFilter: "blur(10px)",
          color: "#1A120B",
          fontSize: 11,
        }}
      >
        ▶
      </motion.button>
    );
  }

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${ACCENT}30`,
        backgroundColor: "#ffffffaf",
        backdropFilter: "blur(10px)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className="flex items-center justify-center gap-2 px-4 py-1 cursor-pointer select-none w-full"
      >
        <span
          className="text-xs font-semibold tracking-[0.08em] uppercase whitespace-nowrap"
          style={{ fontFamily: "var(--font-card-summary)", color: ACCENT }}
        >
          Menu
        </span>
        <span className="text-[10px] flex-none" style={{ color: "#1A120B" }}>
          ▶
        </span>
      </motion.button>
    </div>
  );
}
