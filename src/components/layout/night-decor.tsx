/**
 * Dark mode only: soft lime / pink diagonal pills, faint tilted squares and two sparkles along
 * the top edges of every page (behind the content). Hidden in light mode, ignored by screen
 * readers and the pointer. The squares are plain on purpose (no hole): the Roblox logo is
 * Roblox's trademark, not decoration for this store.
 */
export function NightDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[60rem] overflow-hidden dark:block"
    >
      {/* Left edge */}
      <span className="absolute -top-10 -left-16 h-28 w-80 -rotate-[35deg] rounded-full bg-linear-to-r from-brand-500/75 to-brand-400/15 blur-[2px] sm:-left-10" />
      <span className="absolute top-[26rem] -left-24 h-24 w-72 -rotate-[35deg] rounded-full bg-linear-to-r from-blush-500/70 to-blush-400/10 blur-[2px] max-sm:hidden" />
      <span className="absolute top-[34rem] -left-10 h-20 w-64 -rotate-[35deg] rounded-full bg-linear-to-r from-brand-500/40 to-transparent blur-[3px] max-sm:hidden" />
      <span className="absolute top-52 left-16 size-36 rotate-[20deg] rounded-[1.75rem] bg-ink-300/15 max-lg:hidden" />

      {/* Right edge */}
      <span className="absolute -top-6 -right-20 h-24 w-80 -rotate-[35deg] rounded-full bg-linear-to-l from-blush-500/65 to-blush-400/10 blur-[2px]" />
      <span className="absolute top-[22rem] -right-24 h-28 w-96 -rotate-[35deg] rounded-full bg-linear-to-l from-brand-500/70 to-brand-400/10 blur-[2px] max-sm:hidden" />
      <span className="absolute top-24 right-32 size-44 -rotate-[18deg] rounded-[2rem] bg-ink-300/10 max-lg:hidden" />

      {/* Sparkles */}
      <Sparkle className="absolute top-[30rem] left-[2%] size-12 animate-float text-brand-500 max-xl:hidden" />
      <Sparkle className="absolute top-40 right-[18%] size-9 animate-float text-blush-500 [animation-delay:1.5s] max-sm:top-24 max-sm:right-6 max-sm:size-6" />
    </div>
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
