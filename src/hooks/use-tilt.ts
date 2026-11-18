"use client";

import { useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useCallback, type PointerEvent } from "react";

const SPRING = { stiffness: 220, damping: 20, mass: 0.4 };

/**
 * 3D tilt that follows the mouse. Pure motion values — no React state,
 * so it runs on the animation frame without re-rendering.
 * Disabled for touch input and when the user prefers reduced motion.
 */
export function useTilt(maxDeg = 10) {
  const reduce = useReducedMotion();
  const max = reduce ? 0 : maxDeg;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), SPRING);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      px.set((event.clientX - rect.left) / rect.width - 0.5);
      py.set((event.clientY - rect.top) / rect.height - 0.5);
    },
    [px, py],
  );

  const onPointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  return {
    style: { rotateX, rotateY, transformPerspective: 1000 },
    onPointerMove,
    onPointerLeave,
  };
}
