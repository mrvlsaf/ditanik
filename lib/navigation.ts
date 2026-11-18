export type NavItem = {
  href: string;
  label: string;
  /** SVG path data (24x24 viewBox, stroke icon) shown beside the label. */
  icon: string;
};

export type NavGroup = {
  /** Heading above the group. Omit for a group with no heading. */
  title?: string;
  items: readonly NavItem[];
};

/** Sidebar / mobile nav, grouped by purpose: Orders, Stock, Setup. */
export const APP_NAV_GROUPS: readonly NavGroup[] = [
  {
    title: "Orders",
    items: [
      {
        href: "/lpo",
        label: "LPOs",
        icon: "M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 6H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1h-2M9 12h6M9 16h4",
      },
      {
        href: "/documents",
        label: "Documents",
        icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
      },
      // Moves inside Documents as a tab in a later step.
      {
        href: "/documents/convert",
        label: "Convert to PDF",
        icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 15l2 2 2-2M12 11v6",
      },
    ],
  },
  {
    title: "Stock",
    items: [
      {
        href: "/fabric",
        label: "Fabric",
        icon: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
      },
      {
        href: "/invoices",
        label: "Invoices",
        icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
      },
      {
        href: "/manufacturers",
        label: "Manufacturers",
        icon: "M3 21V10l6 4V10l6 4V6h6v15zM3 21h18",
      },
    ],
  },
  {
    title: "Setup",
    items: [
      {
        href: "/consumption",
        label: "Consumption rates",
        icon: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4",
      },
      {
        href: "/settings/company",
        label: "Company profile",
        icon: "M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M4 21h16",
      },
    ],
  },
];

/** Flat list of every sidebar destination. */
export const APP_NAV_ITEMS: readonly NavItem[] = APP_NAV_GROUPS.flatMap(
  (group) => group.items,
);

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The sidebar item a path belongs to. The longest matching href wins, so
 * "/documents" does not also light up on "/documents/convert".
 */
export function activeNavItem(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of APP_NAV_ITEMS) {
    if (
      matchesPath(pathname, item.href) &&
      (!best || item.href.length > best.href.length)
    ) {
      best = item;
    }
  }
  return best;
}

/** The group heading and item a path sits under, used for breadcrumbs. */
export function navContextForPath(
  pathname: string,
): { group: string | null; item: NavItem } | null {
  const item = activeNavItem(pathname);
  if (!item) {
    return null;
  }
  const group = APP_NAV_GROUPS.find((g) => g.items.includes(item));
  return { group: group?.title ?? null, item };
}
