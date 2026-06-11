"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbX } from "react-icons/tb";
import { LiaGithubSquare, LiaLinkedin } from "react-icons/lia";
import Transparency from "./pages/Transparency";
import type { DieeseRow } from "../../lib/annualInflation";

const Divider = () => (
  <div className="w-full h-[1px] bg-black/10 my-10" aria-hidden="true" />
);

export default function Footer({
  dieeseRows = [],
}: {
  dieeseRows?: DieeseRow[];
}) {
  const [showTransparency, setShowTransparency] = useState(false);

  return (
    <>
      <footer className="w-full py-6 text-center text-sm text-gray-600">
        <Divider />

        <div className="flex flex-row gap-6 justify-center mt-2 items-center">
          <button
            onClick={() => setShowTransparency(true)}
            className="text-xs uppercase tracking-widest text-[#8B7355] hover:text-black transition-colors font-light"
          >
            Transparência
          </button>

          <a
            href="https://linkedin.com/in/narayanedemetrio/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#8B7355] hover:text-black transition-colors font-light"
          >
            <LiaLinkedin size={16} />
            LinkedIn
          </a>

          <a
            href="https://github.com/nggzwk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#8B7355] hover:text-black transition-colors font-light"
          >
            <LiaGithubSquare size={16} />
            GitHub
          </a>
        </div>

        <p
          className="text-sm uppercase mt-4 tracking-wide font-medium"
          style={{ font: "var(--font-card-summary)", color: "#8B7355" }}
        >
        </p>
      </footer>

      <AnimatePresence>
        {showTransparency && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-40 bg-black/20"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              onClick={() => setShowTransparency(false)}
            />
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
              <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
                <span className="text-xs uppercase tracking-widest text-[#8B7355] font-light">
                  transparência
                </span>
                <button
                  aria-label="Fechar"
                  onClick={() => setShowTransparency(false)}
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <TbX size={22} strokeWidth={1} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Transparency dieeseRows={dieeseRows} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
