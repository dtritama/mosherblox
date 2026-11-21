"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function inputClass(invalid: boolean) {
  return cn(
    "h-12 w-full rounded-xl border-2 bg-white px-4 text-sm text-ink-900 transition-colors outline-none placeholder:text-ink-300 focus:border-brand-500",
    invalid ? "border-blush-500" : "border-brand-100 hover:border-brand-300",
  );
}

/** Numbered checkout step with an optional inline error. */
export function Step({
  number,
  title,
  error,
  aside,
  children,
}: {
  number: number;
  title: string;
  error?: string;
  /** Extra content on the right of the title (e.g. a hint). Hidden while an error shows. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-400 dark:text-coal">
          {number}
        </span>
        <h3 className="font-semibold text-ink-900">{title}</h3>
        {error ? (
          <span role="alert" className="ml-auto text-right text-xs font-medium text-blush-700">
            {error}
          </span>
        ) : aside ? (
          <span className="ml-auto text-right text-xs text-ink-500">{aside}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export interface FieldControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

/** Label + control + hint/error, wired up for screen readers. The control is rendered by `children`. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": message ? messageId : undefined })}
      {message ? (
        <p
          id={messageId}
          className={cn(
            "mt-1.5 flex items-center gap-1.5 text-xs",
            error ? "font-medium text-blush-700" : "text-ink-500",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn("max-w-[60%] truncate text-right text-ink-900", strong ? "font-bold" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}
