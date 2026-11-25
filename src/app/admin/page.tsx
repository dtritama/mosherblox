import { ChevronLeft, ChevronRight, ImageIcon, Search, ShieldAlert, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import { ExportOrders } from "@/components/admin/export-orders";
import { LiveOrders } from "@/components/admin/live-orders";
import { formatAdminDate, formatWhatsapp, PreorderBadge, StatusBadge } from "@/components/admin/status-badge";
import { formatIDR, interpolate } from "@/i18n/format";
import { cn } from "@/lib/utils";
import {
  ADMIN_FILTERS,
  countByFilter,
  getOrdersVersion,
  isAdminFilter,
  listOrders,
  type AdminFilter,
  type AdminOrderListItem,
} from "@/server/admin/orders";
import { requireAdmin } from "@/server/auth/admin";

export const metadata: Metadata = { title: adminCopy.orders.title };

const t = adminCopy.orders;

function hrefFor(params: { filter: AdminFilter; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.filter !== "check") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const filterParam = one(params.filter);
  const filter: AdminFilter = isAdminFilter(filterParam) ? filterParam : "check";
  const q = one(params.q).slice(0, 64);
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(params.page), 10) || 1));

  // Before the list: a change in between is then picked up by the next check, never missed.
  const version = await getOrdersVersion();
  const [{ items, total, pages }, counts] = await Promise.all([listOrders({ filter, q, page }), countByFilter()]);

  return (
    <AdminShell admin={admin} current="orders">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-500">{t.description}</p>
          <LiveOrders version={version} />
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <form action="/admin" className="flex w-full gap-2 lg:w-auto" role="search">
            {filter !== "check" ? <input type="hidden" name="filter" value={filter} /> : null}
            <label htmlFor="admin-search" className="sr-only">
              {t.searchLabel}
            </label>
            <input
              id="admin-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t.searchPlaceholder}
              className="h-11 w-full min-w-0 rounded-xl border-2 border-brand-100 bg-white px-4 text-sm outline-none placeholder:text-ink-300 hover:border-brand-300 focus:border-brand-500 sm:w-80"
            />
            <button
              type="submit"
              aria-label={t.search}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-400 text-coal transition-colors hover:bg-brand-300 active:scale-[0.97]"
            >
              <Search className="size-4" aria-hidden="true" />
            </button>
            {q ? (
              <Link
                href={hrefFor({ filter })}
                aria-label={t.clear}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-200 bg-white text-ink-700 hover:border-blush-300"
              >
                <X className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </form>
          {/* "Perlu dicek" is the to-do list: export everything from there. */}
          <ExportOrders status={filter === "check" ? "all" : filter} className="shrink-0 rounded-xl" />
        </div>
      </div>

      {/* Filter tabs: plain links, so the URL is shareable and Back works. */}
      <nav aria-label="Filter status" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {ADMIN_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <li key={key}>
                <Link
                  href={hrefFor({ filter: key, q })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
                    active
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-brand-100 bg-white text-ink-700 hover:border-brand-300",
                  )}
                >
                  {key === "check" ? <ShieldAlert className="size-4" aria-hidden="true" /> : null}
                  {adminCopy.filters[key]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-xs tabular-nums",
                      active
                        ? "bg-white/15 text-white"
                        : key === "check" && counts.check > 0
                          ? "bg-blush-500 text-snow dark:bg-blush-400 dark:text-coal"
                          : "bg-brand-50 text-ink-500",
                    )}
                  >
                    {counts[key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-label={adminCopy.filters[filter]} className="mt-4">
        {items.length === 0 ? (
          <p className="rounded-[1.75rem] border border-dashed border-brand-200 bg-white px-6 py-12 text-center text-sm text-ink-500">
            {filter === "check" && !q ? t.emptyCheck : t.empty}
          </p>
        ) : (
          <>
            <OrderTable items={items} />
            <OrderCards items={items} />
          </>
        )}
      </section>

      {pages > 1 ? (
        <nav aria-label="Halaman" className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-500">
          <span>
            {interpolate(t.page, { page, pages })} · {total}
          </span>
          <div className="flex gap-2">
            <PageLink href={page > 1 ? hrefFor({ filter, q, page: page - 1 }) : null} label={t.prev} icon="prev" />
            <PageLink href={page < pages ? hrefFor({ filter, q, page: page + 1 }) : null} label={t.next} icon="next" />
          </div>
        </nav>
      ) : null}
    </AdminShell>
  );
}

function PageLink({ href, label, icon }: { href: string | null; label: string; icon: "prev" | "next" }) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const className =
    "inline-flex h-11 items-center gap-1 rounded-xl border border-brand-200 bg-white px-3 font-semibold text-ink-900";
  if (!href)
    return (
      <span aria-disabled="true" className={cn(className, "opacity-40")}>
        {icon === "prev" ? <Icon className="size-4" aria-hidden="true" /> : null}
        {label}
        {icon === "next" ? <Icon className="size-4" aria-hidden="true" /> : null}
      </span>
    );
  return (
    <Link href={href} className={cn(className, "hover:border-brand-400")}>
      {icon === "prev" ? <Icon className="size-4" aria-hidden="true" /> : null}
      {label}
      {icon === "next" ? <Icon className="size-4" aria-hidden="true" /> : null}
    </Link>
  );
}

function PaymentFlags({ item }: { item: AdminOrderListItem }) {
  if (item.status !== "pending" || item.paymentStatus !== "submitted") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blush-100 px-2 py-0.5 text-[11px] font-semibold text-blush-800">
      {t.claimed}
      {item.hasProof ? (
        <>
          <ImageIcon className="size-3" aria-hidden="true" />
          <span className="sr-only">· {t.proof}</span>
        </>
      ) : null}
    </span>
  );
}

/** Desktop: a real table. Each ID links to the order. */
function OrderTable({ items }: { items: AdminOrderListItem[] }) {
  const c = t.columns;
  return (
    <div className="hidden overflow-hidden rounded-[1.75rem] border border-brand-100 bg-white md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-brand-100 bg-brand-50/60 text-xs font-semibold tracking-wider text-ink-500 uppercase">
          <tr>
            <th scope="col" className="px-5 py-3">
              {c.id}
            </th>
            <th scope="col" className="px-3 py-3">
              {c.date}
            </th>
            <th scope="col" className="px-3 py-3">
              {c.item}
            </th>
            <th scope="col" className="px-3 py-3">
              {c.account}
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              {c.total}
            </th>
            <th scope="col" className="px-5 py-3">
              {c.status}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-brand-50/50">
              <td className="px-5 py-3">
                <Link
                  href={`/admin/orders/${item.id}`}
                  className="font-mono font-bold tracking-wide text-ink-900 underline decoration-brand-300 decoration-2 underline-offset-4 hover:decoration-brand-500"
                >
                  {item.id}
                </Link>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-ink-500">{formatAdminDate(item.createdAt)}</td>
              <td className="px-3 py-3">
                <span className="font-medium text-ink-900">{item.item}</span>
                <span className="block text-xs text-ink-500">{item.productName}</span>
              </td>
              <td className="px-3 py-3">
                <span className="text-ink-900">{item.account}</span>
                <span className="block text-xs text-ink-500">{formatWhatsapp(item.whatsapp)}</span>
              </td>
              <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-ink-900 tabular-nums">
                {formatIDR(item.total)}
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={item.status} />
                  {item.isPreorder ? <PreorderBadge /> : null}
                  <PaymentFlags item={item} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phone: one card per order, the whole card is the link. */
function OrderCards({ items }: { items: AdminOrderListItem[] }) {
  return (
    <ul className="grid gap-3 md:hidden">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/orders/${item.id}`}
            className="block rounded-2xl border border-brand-100 bg-white p-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brand-300"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono font-bold tracking-wide text-ink-900">{item.id}</span>
              <span className="flex flex-col items-end gap-1">
                <StatusBadge status={item.status} />
                {item.isPreorder ? <PreorderBadge /> : null}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-ink-900">{item.item}</p>
            <p className="text-xs text-ink-500">
              {item.account} · {formatWhatsapp(item.whatsapp)}
            </p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <span className="text-xs text-ink-500">{formatAdminDate(item.createdAt)}</span>
              <span className="font-bold text-ink-900 tabular-nums">{formatIDR(item.total)}</span>
            </div>
            <div className="mt-2 empty:hidden">
              <PaymentFlags item={item} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrdersSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-brand-100" />
      <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-brand-100/70" />
      <div className="mt-4 h-72 w-full animate-pulse rounded-[1.75rem] bg-white" />
    </div>
  );
}
