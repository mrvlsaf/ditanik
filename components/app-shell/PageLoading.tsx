/** Full-page pending state shown while a route segment streams in. */
export function PageLoading({
  label = "Loading…",
}: Readonly<{
  label?: string;
}>) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-600">{label}</p>
    </div>
  );
}
