/** Shown instead of an empty list: says what is missing and what to do next. */
export function EmptyState({
  title,
  children,
  action,
}: Readonly<{
  title: string;
  children?: React.ReactNode;
  /** A button or link that fixes the emptiness, for example "New LPO". */
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
      <p className="text-base font-bold text-[var(--foreground)]">{title}</p>
      {children ? (
        <div className="max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
          {children}
        </div>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
