import React, { createElement, Fragment, forwardRef } from "react";

type MotionProps = {
  children?: React.ReactNode;
  animate?: unknown;
  initial?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  whileInView?: unknown;
  viewport?: unknown;
  onHoverStart?: unknown;
  onHoverEnd?: unknown;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, React.ForwardRefExoticComponent<any>> = {};

function motionEl(tag: string) {
  return (cache[tag] ??= forwardRef(
    (
      {
        children,
        animate, initial, exit, transition, variants,
        whileHover, whileTap, whileInView, viewport,
        onHoverStart, onHoverEnd,
        ...rest
      }: MotionProps,
      ref: React.Ref<unknown>,
    ) => createElement(tag as keyof JSX.IntrinsicElements, { ...rest, ref }, children),
  ));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const motion = new Proxy({} as Record<string, React.ForwardRefExoticComponent<any>>, {
  get: (_, tag) => motionEl(String(tag)),
});

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) =>
  createElement(Fragment, null, children);

export const useInView = () => true;
