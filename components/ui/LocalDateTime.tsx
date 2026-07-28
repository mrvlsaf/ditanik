"use client";

/** Renders an ISO timestamp in the browser's local timezone. */
export function LocalDateTime({
  value,
  className,
}: Readonly<{
  value: string | Date;
  className?: string;
}>) {
  const date = typeof value === "string" ? new Date(value) : value;
  const iso = date.toISOString();

  return (
    <time dateTime={iso} className={className}>
      {date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}
