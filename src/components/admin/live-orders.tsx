"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminCopy } from "@/app/admin/copy";
import { cn } from "@/lib/utils";

const t = adminCopy.orders.live;
const INTERVAL_MS = 5000;
/** How long "Baru diperbarui" stays. */
const NOTICE_MS = 6000;

/**
 * Keeps the order list up to date: asks a tiny endpoint every few seconds whether anything changed
 * (new order, "Saya sudah bayar", status change) and only then reloads the list. Search text, filter
 * and scroll position stay. Paused while the browser tab is hidden; checks at once when it is back.
 */
export function LiveOrders({ version }: { version: string }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [updatedVersion, setUpdatedVersion] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let running = false;
    let timer: number | undefined;
    const abort = new AbortController();

    const check = async () => {
      window.clearTimeout(timer);
      // One check at a time (the timer and a tab switch can coincide).
      if (stopped || running || document.hidden) return;
      running = true;
      try {
        const response = await fetch("/admin/orders-version", { cache: "no-store", signal: abort.signal });
        if (stopped) return;
        if (response.status === 401) return router.refresh(); // session ended: the page sends to login
        if (!response.ok) throw new Error(String(response.status));
        const latest = ((await response.json()) as { version: string }).version;
        if (stopped) return;
        setOnline(true);
        if (latest !== version) {
          setUpdatedVersion(latest);
          // The new list comes with its own version, which restarts this effect.
          router.refresh();
        }
      } catch {
        if (stopped) return;
        setOnline(false);
      } finally {
        running = false;
      }
      timer = window.setTimeout(check, INTERVAL_MS);
    };

    timer = window.setTimeout(check, INTERVAL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      abort.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [version, router]);

  useEffect(() => {
    if (!updatedVersion) return;
    const timer = window.setTimeout(() => setUpdatedVersion(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [updatedVersion]);

  return (
    <p role="status" className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-ink-500">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          online ? "bg-brand-500" : "bg-blush-500",
          updatedVersion && "animate-pulse",
        )}
      />
      {!online ? t.offline : updatedVersion ? t.updated : t.on}
    </p>
  );
}
