"use client";

import { useSyncExternalStore } from "react";

import type { LocalizedText } from "@/i18n/config";
import type { Order } from "@/lib/orders/types";

/**
 * The buyer's recent orders, remembered in THIS browser only (localStorage), so a refresh or a
 * closed tab during payment doesn't lose the order ID. Nothing here is sent anywhere: opening one
 * still goes through the normal lookup (order ID + WhatsApp). Storage can be blocked (private
 * mode, cleared data) — then the list is simply empty.
 */

export interface RecentOrder {
  id: string;
  whatsapp: string;
  item: LocalizedText;
  total: number;
  createdAt: string;
}

const KEY = "mb.recentOrders";
const MAX = 5;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const EMPTY: RecentOrder[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedList: RecentOrder[] = EMPTY;

function isRecentOrder(value: unknown): value is RecentOrder {
  const v = value as RecentOrder;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.id === "string" &&
    /^MB-[A-Z0-9]{4,13}$/.test(v.id) &&
    typeof v.whatsapp === "string" &&
    /^628\d{6,13}$/.test(v.whatsapp) &&
    typeof v.total === "number" &&
    typeof v.createdAt === "string" &&
    typeof v.item === "object" &&
    v.item !== null
  );
}

function read(): RecentOrder[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MAX_AGE_MS;
    cachedList = Array.isArray(parsed)
      ? parsed.filter(isRecentOrder).filter((order) => Date.parse(order.createdAt) > cutoff)
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function write(list: RecentOrder[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Storage blocked or full: the order just isn't remembered.
  }
  listeners.forEach((listener) => listener());
}

/** Remember (or move to the top) an order the buyer just created or looked up. */
export function rememberOrder(order: Order) {
  const entry: RecentOrder = {
    id: order.id,
    whatsapp: order.whatsapp,
    item: order.item,
    total: order.total,
    createdAt: order.createdAt,
  };
  if (!isRecentOrder(entry)) return;
  write([entry, ...read().filter((saved) => saved.id !== order.id)]);
}

export function forgetOrder(id: string) {
  write(read().filter((saved) => saved.id !== id));
}

export function findRecentOrder(id: string) {
  return read().find((saved) => saved.id === id) ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Empty on the server and during hydration, then the saved list. */
export function useRecentOrders() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
