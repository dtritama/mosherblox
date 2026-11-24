/** Date ranges for the order export, in the store's time zone (WIB = UTC+7, no daylight saving). */

export const EXPORT_PERIODS = ["all", "today", "last7", "month", "lastMonth", "custom"] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];

const DAY = 24 * 60 * 60 * 1000;
const WIB = 7 * 60 * 60 * 1000;

/** YYYY-MM-DD in WIB. */
export const wibDay = (date: Date) => new Date(date.getTime() + WIB).toISOString().slice(0, 10);
/** HH:MM in WIB. */
export const wibTime = (date: Date) => new Date(date.getTime() + WIB).toISOString().slice(11, 16);

/** Midnight WIB at the start of that day; null when it isn't a real date. */
function startOf(day: string): Date | null {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) || wibDay(date) !== day ? null : date;
}

export interface ExportRange {
  /** Inclusive / exclusive; null = no limit. */
  from: Date | null;
  until: Date | null;
}

/** Null when the custom dates are wrong (missing, not real, or the end before the start). */
export function exportRange(period: ExportPeriod, now: Date, from = "", to = ""): ExportRange | null {
  const today = wibDay(now);
  const at = (day: string) => new Date(`${day}T00:00:00+07:00`);
  const firstOfMonth = at(`${today.slice(0, 7)}-01`);
  const tomorrow = new Date(at(today).getTime() + DAY);
  switch (period) {
    case "all":
      return { from: null, until: null };
    case "today":
      return { from: at(today), until: tomorrow };
    case "last7":
      return { from: new Date(tomorrow.getTime() - 7 * DAY), until: tomorrow };
    case "month":
      return { from: firstOfMonth, until: tomorrow };
    case "lastMonth":
      return { from: at(`${wibDay(new Date(firstOfMonth.getTime() - DAY)).slice(0, 7)}-01`), until: firstOfMonth };
    case "custom": {
      const start = startOf(from);
      const end = startOf(to);
      if (!start || !end || end < start) return null;
      return { from: start, until: new Date(end.getTime() + DAY) };
    }
  }
}
