import { BadgeCheck, CircleAlert, Clock, Hourglass, Loader2, PackageCheck } from "lucide-react";

import type { OrderStatus } from "@/lib/orders/types";

/** Badge colour + icon per order status. Plain module (no "use client") so server pages can use it too. */
export const statusStyles: Record<OrderStatus, { badge: string; icon: typeof Clock }> = {
  pending: { badge: "bg-amber-100 text-amber-800", icon: Clock },
  paid: { badge: "bg-brand-100 text-brand-800", icon: BadgeCheck },
  processing: { badge: "bg-sky-100 text-sky-800", icon: Loader2 },
  completed: { badge: "bg-brand-100 text-brand-800", icon: PackageCheck },
  failed: { badge: "bg-blush-100 text-blush-800", icon: CircleAlert },
  expired: { badge: "bg-ink-300/25 text-ink-700", icon: Hourglass },
};
