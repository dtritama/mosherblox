"use client";

import { BadgeCheck, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { interpolate } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { isRobloxUsername } from "@/lib/validation";
import { lookupRobloxUserAction, type RobloxLookupResult } from "@/server/roblox/actions";

type Lookup = { for: string; result: RobloxLookupResult } | null;

/**
 * Under the Roblox username field: shows the account that username belongs to (avatar +
 * display name + @username, looked up on Roblox via our server) and the required
 * "Ya, ini akun Roblox saya" tick. The parent resets `confirmed` whenever the username changes.
 */
export function RobloxAccountCheck({
  username,
  confirmed,
  onConfirmedChange,
  invalid,
}: {
  username: string;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  /** Show the tick in its error state (form was submitted without it). */
  invalid?: boolean;
}) {
  const { dict } = useI18n();
  const t = dict.checkout.robloxCheck;
  const confirmId = useId();
  const name = username.trim();
  const valid = isRobloxUsername(name);
  const [lookup, setLookup] = useState<Lookup>(null);

  // Debounced lookup while typing; results for an older username are ignored.
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      let result: RobloxLookupResult;
      try {
        result = await lookupRobloxUserAction(name);
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (!cancelled) setLookup({ for: name, result });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, valid]);

  if (!valid) return null;
  const current = lookup?.for === name ? lookup.result : null;

  if (!current) {
    return (
      <p role="status" className="mt-2 flex items-center gap-2 text-xs text-ink-500">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {t.checking}
      </p>
    );
  }

  if (!current.ok && current.error === "notFound") {
    return (
      <p role="alert" className="mt-2 flex items-start gap-2 text-xs font-medium text-blush-700">
        <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {t.notFound}
      </p>
    );
  }

  const user = current.ok ? current.user : null;
  return (
    <div
      className={cn(
        "mt-2 rounded-2xl border-2 p-3 transition-colors",
        confirmed ? "border-brand-400 bg-brand-50" : invalid ? "border-blush-300 bg-blush-50/60" : "border-brand-100",
      )}
    >
      {user ? (
        <div className="flex min-w-0 items-center gap-3">
          {user.avatarUrl ? (
            // Roblox CDN image (allowed in the CSP); next/image would need a remote pattern for no gain here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={interpolate(t.avatarAlt, { name: user.name })}
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-xl bg-brand-100"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-lg font-bold text-brand-700">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink-900">{user.displayName}</span>
            <span className="block truncate text-xs text-ink-500">@{user.name}</span>
          </span>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-xs text-ink-700">
          <CircleAlert className="mt-px size-3.5 shrink-0 text-blush-500" aria-hidden="true" />
          {t.unavailable}
        </p>
      )}
      <label
        htmlFor={confirmId}
        className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink-900"
      >
        <input
          id={confirmId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          aria-invalid={invalid && !confirmed}
          className="size-5 shrink-0 accent-brand-600"
        />
        <span className="flex items-center gap-1.5">
          {user ? t.confirm : t.confirmUnchecked}
          {user && confirmed ? <BadgeCheck className="size-4 text-brand-600" aria-hidden="true" /> : null}
        </span>
      </label>
    </div>
  );
}
