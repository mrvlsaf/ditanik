/** Compact in-page spinner for streamed sections. */
export function SectionLoading({
  label = "Loading…",
}: Readonly<{
  label?: string;
}>) {
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--brand)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
