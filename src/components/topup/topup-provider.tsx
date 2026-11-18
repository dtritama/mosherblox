"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import { getProductBySlug } from "@/lib/catalog";
import type { Product } from "@/types";

// The checkout dialog is only needed after a click, so it's split into its own chunk.
const TopUpDialog = dynamic(() => import("./topup-dialog").then((mod) => mod.TopUpDialog), { ssr: false });

interface TopUpContextValue {
  /** Open checkout for a product, optionally with an option pre-selected. */
  openTopUp: (slug: string, optionId?: string) => void;
}

const TopUpContext = createContext<TopUpContextValue | null>(null);

interface ActiveOrder {
  product: Product;
  optionId?: string;
}

export function TopUpProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveOrder | null>(null);

  const openTopUp = useCallback((slug: string, optionId?: string) => {
    const product = getProductBySlug(slug);
    if (product) setActive({ product, optionId });
  }, []);

  const close = useCallback(() => setActive(null), []);
  const value = useMemo(() => ({ openTopUp }), [openTopUp]);

  return (
    <TopUpContext value={value}>
      {children}
      <AnimatePresence>
        {active ? (
          <TopUpDialog
            key={`${active.product.slug}:${active.optionId ?? ""}`}
            product={active.product}
            initialOptionId={active.optionId}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
    </TopUpContext>
  );
}

export function useTopUp() {
  const context = use(TopUpContext);
  if (!context) throw new Error("useTopUp must be used inside <TopUpProvider>");
  return context;
}
