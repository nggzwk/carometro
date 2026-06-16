"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import "./Cart.css";

interface CartProps {
  count: number;
  popTick: number;
  onClick: () => void;
}

export default function Cart({ count, popTick, onClick }: CartProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (popTick === 0) return;
    void controls.start({
      scale: [1, 1.22, 0.9, 1.07, 1],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, [popTick, controls]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={controls}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      className="custom-cart-circle"
      aria-label="Ver itens da cesta"
    >
      <span className="custom-cart-circle__icon">🛒</span>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 1.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="custom-cart-circle__dot"
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
}
