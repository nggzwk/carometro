"use client";

import { useState } from "react";
import { TbMenu, TbX, TbChevronRight } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import Transparency from "./pages/Transparency";
import type { DieeseRow } from "../../lib/annualInflation";

type Page = "transparency";

const pages: { id: Page; label: string }[] = [
  { id: "transparency", label: "TRANSPARÊNCIA" },
];

export default function Menu({ dieeseRows = [] }: { dieeseRows?: DieeseRow[] }) {
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState<Page | null>(null);

  const pageComponents: Record<Page, React.ReactNode> = {
    transparency: <Transparency dieeseRows={dieeseRows} />,
  };

  const handleClose = () => {
    setActivePage(null);
    setOpen(false);
  };

  return (
    <>
      <nav className="w-full flex justify-start px-6 pt-4 sm:px-10 lg:px-16">
        <button
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <TbMenu size={28} strokeWidth={1} />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-40 bg-black/20"
              style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.aside
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="fixed top-0 left-0 h-full z-50 w-full max-w-lg overflow-hidden flex flex-col"
              style={{
                fontFamily: "var(--font-card-summary)",
                background: "#ffffffc0",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRight: "1px solid rgba(168, 155, 140, 0.2)",
                boxShadow: "8px 0 40px rgba(139, 115, 85, 0.1)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
                <AnimatePresence mode="wait">
                  {activePage ? (
                    <motion.button
                      key="back"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setActivePage(null)}
                      className="text-xs uppercase tracking-widest text-[#8B7355] hover:text-black transition-colors font-light"
                    >
                      ← voltar
                    </motion.button>
                  ) : (
                    <motion.span
                      key="title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs uppercase tracking-widest text-[#8B7355] font-light"
                    >
                      menu
                    </motion.span>
                  )}
                </AnimatePresence>

                <button
                  aria-label="Fechar menu"
                  onClick={handleClose}
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <TbX size={22} strokeWidth={1} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto relative">
                <AnimatePresence mode="wait">
                  {!activePage ? (
                    <motion.nav
                      key="nav"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="px-8 py-4"
                    >
                      {pages.map(({ id, label }, i) => (
                        <motion.button
                          key={id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                          onClick={() => setActivePage(id)}
                          className="w-full flex items-center justify-between py-5 border-b border-black/8 group"
                        >
                          <span
                            className="text-2xl font-light tracking-[0.12em] text-black group-hover:text-[#8B7355] transition-colors"
                          >
                            {label}
                          </span>
                          <TbChevronRight
                            size={18}
                            strokeWidth={1}
                            className="text-[#8B7355] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </motion.button>
                      ))}
                    </motion.nav>
                  ) : (
                    <motion.div
                      key={activePage}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {pageComponents[activePage]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
