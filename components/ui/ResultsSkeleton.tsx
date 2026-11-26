/** Placeholder for a table of results while a filter loads. */
export function ResultsSkeleton({
  rows = 6,
  tiles = false,
}: Readonly<{
  rows?: number;
  /** Also show a row of summary tiles above the table. */
  tiles?: boolean;
}>) {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      {tiles ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <div key={tile} className="surface-card space-y-3 p-4">
              <div className="h-3 w-24 rounded bg-[#e3e6df]" />
              <div className="h-6 w-32 rounded bg-[#e3e6df]" />
              <div className="h-3 w-40 rounded bg-[#eceee8]" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="surface-card overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3.5">
          <div className="h-3 w-1/3 rounded bg-[#e3e6df]" />
        </div>
        <div className="divide-y divide-[#eef0ea]">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex items-center gap-6 px-4 py-4">
              <div className="h-4 w-1/5 rounded bg-[#e3e6df]" />
              <div className="h-4 w-1/4 rounded bg-[#eceee8]" />
              <div className="hidden h-4 w-1/6 rounded bg-[#eceee8] sm:block" />
              <div className="ml-auto h-7 w-20 rounded-full bg-[#e3e6df]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
