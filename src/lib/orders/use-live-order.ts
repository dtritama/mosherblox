"use client";

import { useEffect, useEffectEvent, useState } from "react";

import type { Order } from "@/lib/orders/types";

const ACTIVE_MS = 6_000;
/** Completed: only delivery screenshots can still be added. */
const COMPLETED_MS = 30_000;
const BACKOFF_MS = 60_000;

/**
 * Keeps an order the buyer has open up to date (payment confirmed, processing, done, admin note,
 * delivery proof) without a refresh. Paused while the tab is hidden, checks at once when it is back,
 * stops when nothing can change any more. Returns false while the connection is down.
 */
export function useLiveOrder(order: Order | null, onChange: (order: Order) => void, enabled = true): boolean {
  const [online, setOnline] = useState(true);
  const id = order?.id;
  const whatsapp = order?.whatsapp;
  const status = order?.status;
  const live = enabled && Boolean(id && whatsapp) && status !== "failed" && status !== "expired";

  const getOrder = useEffectEvent(() => order);
  const apply = useEffectEvent((next: Order, seen: Order | null) => {
    // The buyer changed it meanwhile ("Saya sudah bayar"): this answer may be older. The next one counts.
    if (!order || order !== seen || next.id !== order.id) return false;
    // Keep the review box as it is: it shows its own thank-you.
    onChange(order.status === "completed" ? { ...next, hasReview: order.hasReview } : next);
    return true;
  });

  useEffect(() => {
    if (!live) return;
    let stopped = false;
    let running = false;
    let version: string | undefined;
    let timer: number | undefined;
    const abort = new AbortController();
    const every = status === "completed" ? COMPLETED_MS : ACTIVE_MS;

    const check = async () => {
      window.clearTimeout(timer);
      if (stopped || running || document.hidden) return;
      running = true;
      let wait = every;
      const seen = getOrder();
      try {
        const response = await fetch("/api/order-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, whatsapp, version }),
          cache: "no-store",
          signal: abort.signal,
        });
        if (stopped) return;
        if (response.status === 404) return; // not this order any more: nothing to follow
        if (response.status === 429) wait = BACKOFF_MS;
        else if (!response.ok) throw new Error(String(response.status));
        else {
          const data = (await response.json()) as { version: string; order?: Order };
          if (stopped) return;
          setOnline(true);
          if (!data.order || apply(data.order, seen)) version = data.version;
        }
      } catch {
        if (stopped) return;
        setOnline(false);
      } finally {
        running = false;
      }
      timer = window.setTimeout(check, wait);
    };

    timer = window.setTimeout(check, every);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      abort.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, id, whatsapp, status]);

  return online;
}
