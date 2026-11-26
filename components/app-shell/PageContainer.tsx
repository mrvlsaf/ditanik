"use client";

import { usePathname } from "next/navigation";

import { Breadcrumb, type BreadcrumbItem } from "@/components/app-shell/Breadcrumb";
import { InfoTip } from "@/components/ui/InfoTip";
import { navContextForPath } from "@/lib/navigation";

/** Orders › LPOs on a list page; Orders › LPOs › <title> on a page beneath it. */
function defaultBreadcrumb(pathname: string, title: string): BreadcrumbItem[] {
  const context = navContextForPath(pathname);
  if (!context) {
    return [];
  }
  const items: BreadcrumbItem[] = [];
  if (context.group) {
    items.push({ label: context.group });
  }
  if (pathname === context.item.href) {
    items.push({ label: context.item.label });
  } else {
    items.push({ label: context.item.label, href: context.item.href });
    items.push({ label: title });
  }
  return items;
}

/**
 * Every page opens the same way: breadcrumb, a title, one line on what the
 * page is for, and the main action on the right.
 */
export function PageContainer({
  title,
  description,
  info,
  breadcrumb,
  actions,
  children,
}: Readonly<{
  title: string;
  description?: string;
  /** Short explanation shown in an (i) tip beside the title. */
  info?: string;
  /** Overrides the breadcrumb worked out from the menu. Pass [] to hide it. */
  breadcrumb?: readonly BreadcrumbItem[];
  /** Main action(s), shown on the right of the title. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}>) {
  const pathname = usePathname();
  const crumbs = breadcrumb ?? defaultBreadcrumb(pathname, title);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 max-w-3xl flex-col gap-1.5">
          <Breadcrumb items={crumbs} />
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[1.875rem] sm:leading-tight">
              {title}
            </h1>
            {info ? <InfoTip label={`About ${title}`}>{info}</InfoTip> : null}
          </div>
          {description ? (
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </main>
  );
}
