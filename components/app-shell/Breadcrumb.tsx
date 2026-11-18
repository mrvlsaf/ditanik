import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  /** Leave out for the current page (and for group headings). */
  href?: string;
};

export function Breadcrumb({
  items,
}: Readonly<{
  items: readonly BreadcrumbItem[];
}>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-[var(--text-muted)]">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? "font-semibold text-[var(--foreground)]" : undefined
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {isLast ? null : <span aria-hidden="true">&rsaquo;</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
