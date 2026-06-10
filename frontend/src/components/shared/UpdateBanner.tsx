"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
const BANNER_MESSAGE = `próxima atualização em 5 de ${MONTHS_PT[nextMonth.getMonth()]} `;

const UpdateBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const iterationsRef = useRef(0);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleIteration = () => {
    iterationsRef.current += 1;
    if (iterationsRef.current >= 1) {
      setPaused(true);
      setVisible(false);
      window.setTimeout(() => setDone(true), 500);
    }
  };

  return (
    <>
      <div className="h-10 md:h-12" aria-hidden="true" />

      <AnimatePresence>
        {!done && visible && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-0 left-0 w-full z-50 bg-[#f2f2f2af] py-2 md:py-3 overflow-hidden"
          >
            <div className="banner-marquee" aria-label={BANNER_MESSAGE}>
              <div
                className="banner-marquee-track"
                style={{ animationPlayState: paused ? "paused" : "running" }}
                onAnimationIteration={handleIteration}
              >
                <div className="banner-marquee-group">
                  <span className="banner-marquee-text text-black text-base md:text-lg font-light lowercase whitespace-nowrap">
                    {BANNER_MESSAGE}
                  </span>
                </div>
                <div className="banner-marquee-group" aria-hidden="true">
                  <span className="banner-marquee-text text-black text-base md:text-lg font-light lowercase whitespace-nowrap">
                    {BANNER_MESSAGE}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UpdateBanner;
