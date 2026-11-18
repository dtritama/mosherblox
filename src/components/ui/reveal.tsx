"use client";

import { m, type HTMLMotionProps, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/** Fades + slides children in once when they scroll into view. */
export function Reveal({ delay = 0, y = 24, children, ...props }: RevealProps) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      {...props}
    >
      {children}
    </m.div>
  );
}

const container: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

type StaggerProps = HTMLMotionProps<"div"> & { stagger?: number };

export function Stagger({ stagger = 0.08, children, ...props }: StaggerProps) {
  return (
    <m.div
      variants={container}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      {...props}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <m.div variants={item} {...props}>
      {children}
    </m.div>
  );
}
