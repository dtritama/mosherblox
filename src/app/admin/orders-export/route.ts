import { adminCopy } from "@/app/admin/copy";
import { formatWhatsapp } from "@/components/admin/status-badge";
import { CSV_SEPARATORS, toCsv, type CsvFormat, type CsvValue } from "@/lib/csv";
import { EXPORT_PERIODS, exportRange, wibDay, wibTime, type ExportPeriod } from "@/lib/export-period";
import { isAdminFilter, listOrdersForExport } from "@/server/admin/orders";
import { getAdmin } from "@/server/auth/admin";

const t = adminCopy.export;

/** "2026-11-24 14:05" in WIB: sorts correctly and is read as a date in every spreadsheet app. */
const stamp = (date: Date | null) => (date ? `${wibDay(date)} ${wibTime(date)}` : null);

/** Starts with "(+…)" abroad: a leading "+" would be read as a formula / number. */
const phone = (normalized: string) => formatWhatsapp(normalized).replace(/^\+(\S*)/, "(+$1)");

/** Order list as a CSV file (admins only): one header row, one line per order, numbers without "Rp" or dots. */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response(null, { status: 303, headers: { Location: "/admin/login" } });
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "all";
  const period = (params.get("period") ?? "all") as ExportPeriod;
  const format = (params.get("format") ?? "semicolon") as CsvFormat;
  const now = new Date();
  const range = EXPORT_PERIODS.includes(period)
    ? exportRange(period, now, params.get("from") ?? "", params.get("to") ?? "")
    : null;
  if (!isAdminFilter(status) || !Object.hasOwn(CSV_SEPARATORS, format) || !range) {
    return new Response(t.invalid, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const orders = await listOrdersForExport(status, range);
  const c = t.columns;
  const rows: CsvValue[][] = [
    Object.values(c),
    ...orders.map((order, index) => {
      const row: Record<keyof typeof c, CsvValue> = {
        no: index + 1,
        id: order.id,
        created: stamp(order.createdAt),
        status: adminCopy.status[order.status],
        product: order.productName,
        item: order.itemLabel.id,
        method: order.robuxMethod ? t.methods[order.robuxMethod] : null,
        robux: order.robuxAmount,
        account: order.account,
        displayName: order.robloxDisplayName,
        whatsapp: phone(order.whatsapp),
        subtotal: order.subtotal,
        fee: order.fee,
        uniqueCode: order.uniqueCode,
        total: order.total,
        payment: order.paymentStatus ? adminCopy.paymentStatus[order.paymentStatus] : null,
        confirmedBy: order.confirmedBy,
        paidAt: stamp(order.paidAt),
        completedAt: stamp(order.completedAt),
      };
      return (Object.keys(c) as (keyof typeof c)[]).map((key) => row[key]);
    }),
  ];

  const first = range.from ? wibDay(range.from) : null;
  const last = range.until ? wibDay(new Date(range.until.getTime() - 1)) : null;
  const dates = first && last ? (first === last ? first : `${first}_sd_${last}`) : `sampai_${wibDay(now)}`;
  const label = adminCopy.filters[status].toLowerCase().replaceAll(" ", "-");
  return new Response(toCsv(rows, format), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pesanan-mosherblox_${label}_${dates}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
