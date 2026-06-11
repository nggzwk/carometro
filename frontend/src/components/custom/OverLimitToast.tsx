"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT, ITEM_LIMIT } from "./constants";

interface OverLimitToastProps {
  show: boolean;
}

export default function OverLimitToast({ show }: OverLimitToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="absolute z-20 left-1/2 -translate-x-1/2"
          style={{ bottom: "6%", pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(230,57,70,0.35)",
              backdropFilter: "blur(10px)",
              borderRadius: 12,
              padding: "0.45rem 0.9rem",
              boxShadow: "0 4px 16px rgba(230,57,70,0.14)",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-card-summary)",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-inflation, #e63946)",
            }}
          >
            Limite de {ITEM_LIMIT} itens atingido.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
