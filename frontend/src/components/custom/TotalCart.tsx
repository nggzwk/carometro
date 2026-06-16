"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CiShare1 } from "react-icons/ci";
import { IoListOutline, IoCheckmarkOutline } from "react-icons/io5";
import { formatBrl } from "../../lib/formatters";
import { EASE_IN, EASE_OUT } from "./constants";
import type { CartLine } from "./types";
import type { CopyStatus, ShareStatus } from "./useShareBasket";
import "./TotalCart.css";

interface TotalCartProps {
  lines: CartLine[];
  count: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: (subcat: number) => void;
  onClear: () => void;
  onShare: () => void;
  shareStatus: ShareStatus;
  onCopy: () => void;
  copyStatus: CopyStatus;
}

export default function TotalCart({
  lines,
  count,
  total,
  isOpen,
  onToggle,
  onRemove,
  onClear,
  onShare,
  shareStatus,
  onCopy,
  copyStatus,
}: TotalCartProps) {
  const isEmpty = lines.length === 0;

  return (
    <div
      className="total-cart"
      style={{
        background: "#ffffffaf",
        border: "1px solid rgba(200, 185, 170, 0.35)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        backdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        className="total-cart__trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="total-cart-body"
      >
        <span className="total-cart__trigger-left">
          <span className="total-cart__cart-icon">🛒</span>
          <span className="total-cart__label">
            {isEmpty
              ? "MINHA CESTA"
              : `${count} ${count === 1 ? "ITEM" : "ITENS"}`}
          </span>
        </span>

        <span className="total-cart__trigger-right">
          {!isEmpty && !isOpen && (
            <span className="total-cart__total-value">{formatBrl(total)}</span>
          )}
          {isEmpty && (
            <span className="total-cart__empty-hint">toque para ver</span>
          )}
          <motion.span
            className="total-cart__chevron"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            aria-hidden="true"
          >
            ▾
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="total-cart-body"
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.38, ease: EASE_OUT },
                opacity: { duration: 0.26, delay: 0.08 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.28, ease: EASE_IN },
                opacity: { duration: 0.16 },
              },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="total-cart__body">
              {isEmpty ? (
                <p className="total-cart__empty-msg">
                  Toque nos itens para montar sua cesta
                </p>
              ) : (
                <>
                  <ul className="total-cart__list">
                    {lines.map((line, i) => (
                      <motion.li
                        key={line.subcat}
                        className="total-cart__line"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: i * 0.04, ease: EASE_OUT }}
                      >
                        <span className="total-cart__line-icon">{line.icon}</span>

                        <span className="total-cart__line-qty">
                          {line.qty === 1 ? "×" : `×${line.qty}`}
                        </span>

                        <span className="total-cart__line-name">{line.name}</span>

                        <span className="total-cart__line-sigla">{line.sigla}</span>

                        <div className="total-cart__line-end">
                          <span className="total-cart__line-subtotal">
                            {formatBrl(line.subtotal)}
                          </span>

                          <div className="total-cart__line-action">
                            <button
                              type="button"
                              className="total-cart__remove"
                              onClick={() => onRemove(line.subcat)}
                              aria-label={`Remover um ${line.name}`}
                            >
                              −
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="total-cart__footer">
                    <button
                      type="button"
                      className="total-cart__clear"
                      onClick={onClear}
                    >
                      Limpar
                    </button>

                    <div className="total-cart__total-row">
                      <span className="total-cart__total-label">TOTAL</span>
                      <span className="total-cart__total-big">{formatBrl(total)}</span>
                    </div>
                  </div>

                  <div className="total-cart__actions">
                    <button
                      type="button"
                      className="total-cart__action-btn"
                      onClick={onCopy}
                      aria-label="Copiar lista de compras"
                    >
                      {copyStatus === "copied" ? (
                        <><IoCheckmarkOutline aria-hidden="true" /> Copiado</>
                      ) : (
                        <><IoListOutline aria-hidden="true" /> Copiar lista</>
                      )}
                    </button>
                    <span className="total-cart__actions-divider" aria-hidden="true" />
                    <button
                      type="button"
                      className="total-cart__action-btn"
                      onClick={onShare}
                      disabled={shareStatus === "sharing"}
                      aria-label="Compartilhar minha lista"
                    >
                      <CiShare1 aria-hidden="true" /> Compartilhar
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
