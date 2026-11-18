"use client";

import { AnimatePresence, m } from "motion/react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form-level error shown next to the submit button (server said no, rate limit, offline…).
 * Field errors stay under their own field; this is only for what no single field explains.
 */
export function SubmitError({ message, className }: { message?: string | null; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <m.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={cn("overflow-hidden", className)}
        >
          <span className="flex items-start gap-2 rounded-xl bg-blush-50 px-3 py-2.5 text-left text-sm text-blush-900">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-blush-500" aria-hidden="true" />
            {message}
          </span>
        </m.p>
      ) : null}
    </AnimatePresence>
  );
}
