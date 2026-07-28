const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-800",
  REVIEWED: "bg-sky-50 text-sky-800",
  DELIVERED: "bg-emerald-50 text-emerald-800",
} as const;

export function LpoStatusBadge({
  status,
}: Readonly<{
  status: keyof typeof STATUS_STYLES;
}>) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
