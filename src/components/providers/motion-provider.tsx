"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * LazyMotion + `m` components keep the animation bundle small (~15kb instead of ~34kb).
 * `strict` throws if someone accidentally imports the full `motion` component.
 * `reducedMotion="user"` respects the OS "reduce motion" setting automatically.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
