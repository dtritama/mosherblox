"use client";

import { createContext, useContext, type ReactNode } from "react";

import { defaultSettings, type SiteSettings } from "@/lib/settings";
import { defaultContact, type ContactContent } from "@/lib/site-content";
import type { PublicStats } from "@/server/stats";

/** The admin-editable values the shop's client components need (prices, QRIS). */
export type StoreSettings = Pick<SiteSettings, "robuxRates" | "qris" | "soldOut" | "robuxStock" | "storeOpen" | "closedMessage"> & {
  stats: PublicStats;
  contact: ContactContent;
};

const SettingsContext = createContext<StoreSettings>({
  robuxRates: defaultSettings.robuxRates,
  qris: defaultSettings.qris,
  soldOut: defaultSettings.soldOut,
  robuxStock: defaultSettings.robuxStock,
  storeOpen: defaultSettings.storeOpen,
  closedMessage: defaultSettings.closedMessage,
  stats: { sendUsernameCompleted: null },
  contact: defaultContact,
});

export function SettingsProvider({ value, children }: { value: StoreSettings; children: ReactNode }) {
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

/** Current Robux rates and QRIS. Falls back to the src/data/* defaults outside the provider. */
export function useStoreSettings() {
  return useContext(SettingsContext);
}
