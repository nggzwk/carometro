export const inViewMotionProps = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: false, amount: 0.25 },
  transition: {
    duration: 0.75,
    ease: [0.16, 1, 0.3, 1] as const,
  },
};
