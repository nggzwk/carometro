"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BasketItemData } from "../../lib/basketTypes";
import {
  getBasketItemIcon,
  getBasketItemSubtitle,
} from "../../lib/basketIcons";
import { formatBrl, formatPct, shortName } from "../../lib/formatters";

interface ItemCardProps {
  item: BasketItemData;
  index?: number;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, index = 0 }) => {
  const {
    item_name,
    mom_pct,
    month_price,
    previous_price,
    produto_subcategoria,
  } = item;

  const [nameRevealed, setNameRevealed] = useState(false);

  const isInflation = (mom_pct ?? 0) > 0;
  const isNeutral = mom_pct === 0;

  const borderColor = isInflation
    ? "var(--color-inflation)"
    : "var(--color-deflation)";
  const accentColor = isInflation ? "#E63946" : "#2A9D8F";
  const arrowDir = isNeutral ? "=" : isInflation ? "▲" : "▼";

  const arrowRef = useRef<HTMLSpanElement | null>(null);
  const [arrowVisible, setArrowVisible] = useState(false);
  const arrowMotionClass = isNeutral
    ? ""
    : isInflation
      ? "arrow-blink-inflation"
      : "arrow-bounce-down";

  useEffect(() => {
    const el = arrowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setArrowVisible(e.isIntersecting)),
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const deltaBrl = previous_price
    ? parseFloat(month_price) - parseFloat(previous_price)
    : 0;

  const displayName = (() => {
    const name = (item_name || "").toLowerCase();
    if (name.includes("coxão")) return "CARNE";
    if (name.includes("filé")) return "FRANGO";
    return shortName(item_name);
  })();

  const icon = getBasketItemIcon(produto_subcategoria);
  const subtitle = getBasketItemSubtitle(produto_subcategoria);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.55,
        delay: (index % 5) * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={
        !nameRevealed
          ? { y: -2, scale: 1.015, transition: { duration: 0.2 } }
          : {}
      }
      className="relative rounded-2xl overflow-hidden h-full cursor-pointer select-none"
      style={{
        border: `3px solid ${borderColor}`,
        background: "var(--color-background)",
        boxShadow: isInflation
          ? "0 2px 16px rgba(230,57,70,0.10)"
          : "0 2px 16px rgba(42,157,143,0.10)",
      }}
      onClick={() => setNameRevealed((v) => !v)}
      role="button"
      aria-pressed={nameRevealed}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key="default"
          initial={{ opacity: 0, y: 4 }}
          animate={nameRevealed ? { opacity: 0, y: -3 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex"
          style={{ pointerEvents: nameRevealed ? "none" : "auto" }}
        >
            <div
              className="flex items-center justify-center"
              style={{
                width: "50%",
                borderRight: `2px solid ${accentColor}20`,
              }}
            >
              <motion.span
                key="emoji-big"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 18,
                  delay: (index % 5) * 0.06 + 0.2,
                }}
                style={{
                  fontSize: "clamp(3.5rem, 15vw, 3.2rem)",
                  lineHeight: 1,
                }}
              >
                {icon}
              </motion.span>
            </div>

            <div
              className="flex flex-col justify-between py-2.5 px-2.5"
              style={{ width: "50%" }}
            >
              <div className="flex items-center justify-between tracking-tight gap-1">
                <span
                  className="tabular-nums font-bold leading-none text-[0.78rem] lg:text-[1rem]"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    color: accentColor,
                  }}
                >
                  {formatPct(mom_pct, true)}
                </span>
                <span
                  ref={arrowRef}
                  className={`font-bold leading-none text-[0.7rem] lg:text-[0.85rem] ${arrowVisible ? arrowMotionClass : ""}`}
                  style={{
                    color: accentColor,
                  }}
                >
                  {arrowDir}
                </span>
              </div>

              <div
                style={{
                  height: "2px",
                  background: `${accentColor}22`,
                }}
              />

              <div className="flex items-end justify-end">
                <span
                  className="tabular-nums font-medium leading-none"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "clamp(0.88rem, 2.8vw, 0.92rem)",
                    color: "#000000",
                  }}
                >
                  {formatBrl(deltaBrl)}
                </span>
              </div>
            </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <motion.div
          key="revealed"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={nameRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          style={{ background: "var(--color-background)", pointerEvents: nameRevealed ? "auto" : "none" }}
        >
          <motion.span
            initial={{ scale: 1.4, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 0.65, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontSize: "0.95rem", lineHeight: 1 }}
          >
            {icon}
          </motion.span>

          <motion.span
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.22,
              duration: 0.34,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center leading-none uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "clamp(1rem, 5vw, 1.4rem)",
              color: "#1A120B",
              fontWeight: 700,
            }}
          >
            {displayName}
          </motion.span>

          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.34,
              duration: 0.34,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.60rem",
              letterSpacing: "0.10em",
              color: "#A89B8C",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </motion.span>
        </motion.div>
      </AnimatePresence>

      {/* Invisible height spacer */}
      <div className="invisible flex pointer-events-none" aria-hidden="true">
        <div
          style={{ width: "50%" }}
          className="flex items-center justify-center py-3"
        >
          <span style={{ fontSize: "clamp(2.5rem, 10vw, 3.2rem)" }}>X</span>
        </div>
        <div
          style={{ width: "50%" }}
          className="flex flex-col justify-between py-2.5 px-2.5"
        >
          <span style={{ fontSize: "0.88rem" }}>+00%</span>
          <span style={{ fontSize: "0.82rem" }}>R$0,00</span>
        </div>
      </div>
    </motion.div>
  );
};
