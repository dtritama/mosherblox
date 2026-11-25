import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { adminCopy } from "@/app/admin/copy";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatAdminDate, formatWhatsapp, StatusBadge } from "@/components/admin/status-badge";
import { StatusActions } from "@/components/admin/status-actions";
import { DeliveryProof } from "@/components/admin/delivery-proof";
import { formatIDR, formatNumber, interpolate } from "@/i18n/format";
import { getGamepassPrice } from "@/lib/robux-pricing";
import { RobuxIcon } from "@/components/ui/robux-icon";
import { normalizeOrderId } from "@/lib/orders/order-id";
import { cn } from "@/lib/utils";
import { whatsappDigits } from "@/lib/validation";
import { getOrderDetail, type AdminOrderDetail } from "@/server/admin/orders";
import { formatAccountNumber } from "@/lib/payment-methods";
import { requireAdmin } from "@/server/auth/admin";
import { getAvatarUrls } from "@/server/roblox/users";

export const metadata: Metadata = { title: adminCopy.detail.order };

const t = adminCopy.detail;

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-24" aria-busy="true" />}>
      <OrderPage params={params} />
    </Suspense>
  );
}

async function OrderPage({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const order = await getOrderDetail(normalizeOrderId(id));

  return (
    <AdminShell admin={admin} current="orders">
      <Link
        href="/admin"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl pr-3 text-sm font-semibold text-ink-700 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.back}
      </Link>
      {order ? (
        <OrderDetail order={order} />
      ) : (
        <p className="mt-4 rounded-2xl bg-white p-6 text-ink-500">{t.notFound}</p>
      )}
    </AdminShell>
  );
}

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[1.75rem] border border-brand-100 bg-white p-5 sm:p-6", className)}>
      <h2 className="text-sm font-semibold tracking-wider text-ink-500 uppercase">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium break-all text-ink-900">{children}</dd>
    </div>
  );
}

/** How many Robux this order is about, next to the account they go to. Nothing for other products. */
function RobuxToSend({ order }: { order: AdminOrderDetail }) {
  if (!order.robuxAmount) return null;
  const cancelled = order.status === "failed" || order.status === "expired";
  const unpaid = order.status === "pending";
  const label = cancelled ? t.notSent : unpaid ? t.unpaid : order.status === "completed" ? t.sent : t.toSend;
  return (
    <div
      className={cn(
        "mb-3 rounded-2xl border p-4",
        cancelled || unpaid ? "border-brand-100 bg-white" : "border-brand-300 bg-brand-100 dark:border-brand-500/60",
      )}
    >
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight tabular-nums",
          cancelled ? "text-ink-500 line-through" : "text-ink-900",
        )}
      >
        <RobuxIcon tone="ink" className="size-6 shrink-0" aria-hidden="true" />
        {formatNumber(order.robuxAmount, "id")} Robux
      </p>
      {order.robuxMethod === "gamepass" && !cancelled && !unpaid ? (
        <p className="mt-1.5 text-xs text-ink-700">
          {interpolate(t.viaGamepass, {
            price: formatNumber(getGamepassPrice(order.robuxAmount), "id"),
            amount: formatNumber(order.robuxAmount, "id"),
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Avatar + names of the Roblox account the buyer confirmed, linking to its profile. */
function RobloxHeader({ id, username, displayName }: { id: number; username: string; displayName: string | null }) {
  const name = displayName ?? username;
  const initial = (
    <span
      aria-hidden="true"
      className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
  return (
    <a
      href={`https://www.roblox.com/users/${id}/profile`}
      target="_blank"
      rel="noopener noreferrer"
      className="group mb-3 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3 transition-colors hover:border-brand-300"
    >
      {/* Roblox can be slow or down: the order shows at once, the avatar follows. */}
      <Suspense fallback={initial}>
        <RobloxAvatar id={id} name={name} fallback={initial} />
      </Suspense>
      <span className="min-w-0">
        <span className="block font-bold break-words text-ink-900">{name}</span>
        <span className="block text-sm break-all text-ink-500">@{username}</span>
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
          {t.robloxProfile}
          <ExternalLink className="size-3" aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}

async function RobloxAvatar({ id, name, fallback }: { id: number; name: string; fallback: ReactNode }) {
  const url = (await getAvatarUrls([id]).catch(() => ({}) as Record<number, string>))[id];
  if (!url) return fallback;
  return (
    // Roblox CDN headshot (allowed in the CSP).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={interpolate(t.avatarAlt, { name })}
      width={64}
      height={64}
      className="size-16 shrink-0 rounded-2xl bg-brand-100"
    />
  );
}

function OrderDetail({ order }: { order: AdminOrderDetail }) {
  const payment = order.payments[0];
  const claimed = order.status === "pending" && payment?.status === "submitted";
  const waText = encodeURIComponent(`Halo, ini admin MOSHERBLOX soal pesanan ${order.id}.`);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-wider text-ink-900">{order.id}</h1>
        <StatusBadge status={order.status} />
        {claimed ? (
          <span className="rounded-full bg-blush-100 px-2.5 py-1 text-xs font-semibold text-blush-800">
            {adminCopy.paymentStatus.submitted}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-500">
        {t.created} {formatAdminDate(order.createdAt)}
      </p>

      {/* Action first on phones; on desktop it sits in the right column next to the facts. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-4 lg:col-start-1 lg:row-start-1">
          <Card title={t.money}>
            <dl>
              <Row label={t.subtotal}>{formatIDR(order.subtotal)}</Row>
              <Row label={t.fee}>{order.fee ? formatIDR(order.fee) : "—"}</Row>
              <Row label={t.uniqueCode}>{formatIDR(order.uniqueCode)}</Row>
            </dl>
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-dashed border-brand-200 pt-3">
              <span className="text-sm font-medium text-ink-700">{t.total}</span>
              <span className="text-3xl font-extrabold tracking-tight text-ink-900 tabular-nums">
                {formatIDR(order.total)}
              </span>
            </div>
          </Card>

          <Card title={t.payment}>
            {payment ? (
              <>
                <dl>
                  <Row label={t.provider}>
                    {order.paymentMethod}
                    {payment.payTo ? (
                      <span className="block text-xs font-normal text-ink-500 tabular-nums">
                        {formatAccountNumber(payment.payTo.number)}
                        <span className="block">
                          {t.holder} {payment.payTo.holder}
                        </span>
                      </span>
                    ) : (
                      ` · ${payment.provider}`
                    )}
                  </Row>
                  <Row label={adminCopy.orders.columns.status}>{adminCopy.paymentStatus[payment.status]}</Row>
                  {payment.confirmedBy && payment.confirmedAt ? (
                    <Row label={t.paidAt}>
                      {formatAdminDate(payment.confirmedAt)}
                      <span className="block text-xs font-normal text-ink-500">
                        {interpolate(t.confirmedBy, { name: payment.confirmedBy })}
                      </span>
                    </Row>
                  ) : null}
                </dl>
                <h3 className="mt-4 text-sm font-medium text-ink-700">{t.proof}</h3>
                {payment.hasProof ? (
                  <a
                    href={`/admin/proofs/${payment.id}`}
                    target="_blank"
                    rel="noopener"
                    className="group mt-2 block w-full max-w-xs overflow-hidden rounded-2xl border border-brand-100"
                  >
                    {/* Served by an admin-only route; next/image can't fetch it (needs the session cookie). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/admin/proofs/${payment.id}`}
                      alt={interpolate(t.proofAlt, { id: order.id })}
                      className="max-h-96 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="flex items-center justify-center gap-1.5 border-t border-brand-100 bg-brand-50 py-2 text-xs font-semibold text-ink-700">
                      {t.openProof}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </span>
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">{t.noProof}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-500">—</p>
            )}
          </Card>

          <Card title={t.order}>
            <dl>
              <Row label={t.item}>{order.item}</Row>
              {order.robuxAmount ? <Row label={t.amount}>{formatNumber(order.robuxAmount, "id")} Robux</Row> : null}
              {order.robuxMethod ? <Row label={t.method}>{order.robuxMethod}</Row> : null}
              <Row label={t.expires}>{formatAdminDate(order.expiresAt)}</Row>
              {order.paidAt ? <Row label={t.paidAt}>{formatAdminDate(order.paidAt)}</Row> : null}
              {order.completedAt ? <Row label={t.completedAt}>{formatAdminDate(order.completedAt)}</Row> : null}
            </dl>
          </Card>

          <Card title={adminCopy.delivery.title}>
            <DeliveryProof
              orderId={order.id}
              saved={order.deliveryProofs}
              canUpload={order.status === "paid" || order.status === "processing" || order.status === "completed"}
            />
          </Card>

          <Card title={t.history}>
            <ol className="grid gap-3">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 size-2.5 shrink-0 rounded-full",
                      event.actor === "admin"
                        ? "bg-ink-900"
                        : event.actor === "buyer"
                          ? "bg-blush-400"
                          : "bg-brand-400",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">
                      {event.fromStatus === null
                        ? t.created_event
                        : event.fromStatus === event.toStatus
                          ? t.claim_event
                          : `${adminCopy.status[event.fromStatus]} → ${adminCopy.status[event.toStatus]}`}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatAdminDate(event.createdAt)} · {event.adminName ?? t.actor[event.actor]}
                    </p>
                    {event.note ? <p className="mt-1 text-ink-700">{event.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid gap-4 max-lg:row-start-1 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <Card title={adminCopy.actions.title}>
            {/* key: a new status gets a fresh form (new options, cleared note). */}
            <StatusActions key={order.status} orderId={order.id} status={order.status} total={order.total} method={order.paymentMethod} />
          </Card>
          <Card title={t.buyer}>
            {order.robloxUserId ? (
              <RobloxHeader id={order.robloxUserId} username={order.account} displayName={order.robloxDisplayName} />
            ) : null}
            <RobuxToSend order={order} />
            <dl>
              {order.robloxUserId ? (
                <>
                  <Row label={t.username}>{order.account}</Row>
                  <Row label={t.displayName}>{order.robloxDisplayName ?? "—"}</Row>
                  <Row label={t.robloxId}>{order.robloxUserId}</Row>
                </>
              ) : (
                <Row label={t.account}>{order.account}</Row>
              )}
              <Row label={t.whatsapp}>{formatWhatsapp(order.whatsapp)}</Row>
            </dl>
            <a
              href={`https://wa.me/${whatsappDigits(order.whatsapp)}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white text-sm font-semibold text-ink-900 transition-colors hover:border-blush-300 active:scale-[0.97]"
            >
              <MessageCircle className="size-4 text-brand-600" aria-hidden="true" />
              {t.chatBuyer}
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
