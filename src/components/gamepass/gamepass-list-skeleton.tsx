/** Placeholder with the same shape as <GamepassList>, shown while a game's gamepasses stream in. */
export function GamepassListSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="flex items-center gap-4 rounded-[2rem] border border-brand-100 bg-brand-50/60 p-5 sm:p-6">
        <div className="size-16 shrink-0 rounded-2xl bg-brand-100 sm:size-20" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-2/5 rounded-lg bg-brand-100" />
          <div className="h-4 w-3/4 rounded-lg bg-brand-100/80" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-40 rounded-3xl border border-brand-100 bg-white p-5">
            <div className="h-5 w-1/2 rounded-md bg-brand-100" />
            <div className="mt-2 h-3 w-1/3 rounded-md bg-brand-50" />
            <div className="mt-12 h-6 w-2/5 rounded-md bg-brand-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
