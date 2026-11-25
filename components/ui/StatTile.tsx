import { InfoTip } from "@/components/ui/InfoTip";

/** A big number with a label, a line of context and an optional (i) tip. */
export function StatTile({
  label,
  value,
  sub,
  tip,
}: Readonly<{
  label: string;
  value: string;
  sub?: string;
  tip?: string;
}>) {
  return (
    <div className="surface-card flex flex-col gap-1 px-5 py-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        {label}
        {tip ? (
          <span className="ml-1.5 align-middle normal-case">
            <InfoTip label={`About ${label}`}>{tip}</InfoTip>
          </span>
        ) : null}
      </p>
      <p className="text-[1.75rem] leading-tight font-bold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      {sub ? <p className="text-xs text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

/** A row of tiles that wraps to fit the screen. */
export function StatTileRow({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <section
      aria-label={label}
      className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-4"
    >
      {children}
    </section>
  );
}
