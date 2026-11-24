import { adminCopy } from "@/app/admin/copy";
import { statusStyles } from "@/components/orders/status-styles";
import type { OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { formatForeignWhatsapp } from "@/lib/validation";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { badge, icon: Icon } = statusStyles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        badge,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {adminCopy.status[status]}
    </span>
  );
}

/** Dates in the store's time zone (WIB), whatever the admin's device is set to. */
const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export const formatAdminDate = (iso: string) => `${dateTime.format(new Date(iso))} WIB`;

/** 6281234567890 → 0812-3456-7890 (how people read Indonesian numbers). */
export function formatWhatsapp(normalized: string) {
  if (normalized.startsWith("+")) return formatForeignWhatsapp(normalized);
  const local = `0${normalized.slice(2)}`;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}
