/**
 * Soft lime / pink diagonal pills, tilted Roblox-logo squares and two sparkles along the top
 * edges of every page (behind the content). Shown in both themes: lighter tints in light mode,
 * stronger ones in dark mode. Ignored by screen readers and the pointer.
 * The squares are the Roblox logo shape on purpose (client request, Nov 2026).
 */
export function NightDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60rem] overflow-hidden">
      {/* Left edge */}
      <span className="absolute -top-10 -left-16 h-28 w-80 -rotate-[35deg] rounded-full bg-linear-to-r from-brand-400/80 to-brand-300/10 blur-[2px] sm:-left-10 dark:from-brand-500/75 dark:to-brand-400/15" />
      <span className="absolute top-[26rem] -left-24 h-24 w-72 -rotate-[35deg] rounded-full bg-linear-to-r from-blush-400/70 to-blush-200/10 blur-[2px] max-sm:hidden dark:from-blush-500/70 dark:to-blush-400/10" />
      <span className="absolute top-[34rem] -left-10 h-20 w-64 -rotate-[35deg] rounded-full bg-linear-to-r from-brand-400/55 to-transparent blur-[3px] max-sm:hidden dark:from-brand-500/40" />
      <RobloxMark
        id="mb-rbx-left"
        className="absolute top-52 left-16 size-36 rotate-[16deg] opacity-45 max-lg:hidden dark:opacity-30"
      />

      {/* Right edge */}
      <span className="absolute -top-6 -right-20 h-24 w-80 -rotate-[35deg] rounded-full bg-linear-to-l from-blush-400/65 to-blush-200/10 blur-[2px] dark:from-blush-500/65 dark:to-blush-400/10" />
      <span className="absolute top-[22rem] -right-24 h-28 w-96 -rotate-[35deg] rounded-full bg-linear-to-l from-brand-400/80 to-brand-300/10 blur-[2px] max-sm:hidden dark:from-brand-500/70 dark:to-brand-400/10" />
      <RobloxMark
        id="mb-rbx-right"
        className="absolute top-24 right-32 size-44 -rotate-[14deg] opacity-55 max-lg:hidden dark:opacity-25"
      />

      {/* Sparkles */}
      <Sparkle className="absolute top-[30rem] left-[2%] size-12 animate-float text-brand-500 max-xl:hidden" />
      <Sparkle className="absolute top-40 right-[18%] size-9 animate-float text-blush-400 [animation-delay:1.5s] max-sm:top-24 max-sm:right-6 max-sm:size-6 dark:text-blush-500" />
    </div>
  );
}

/**
 * Roblox logo shape: a near-sharp square with a centred square hole, silver gradient
 * (darker silver in light mode so it shows on white). `id` must be unique per instance.
 */
function RobloxMark({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" className="[stop-color:#d5dde8] dark:[stop-color:#f8fafc]" />
          <stop offset="0.45" className="[stop-color:#aeb9c8] dark:[stop-color:#cbd5e1]" />
          <stop offset="1" className="[stop-color:#7d8a9c] dark:[stop-color:#7c8796]" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        fillRule="evenodd"
        d="M3 0h94a3 3 0 0 1 3 3v94a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3Zm33 36v28h28V36H36Z"
      />
    </svg>
  );
}

/** Four-point star. */
function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c.9 6.4 5.1 10.9 12 12-6.9 1.1-11.1 5.6-12 12-.9-6.4-5.1-10.9-12-12C6.9 10.9 11.1 6.4 12 0Z" />
    </svg>
  );
}
