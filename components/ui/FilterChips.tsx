"use client";

import { FilterOptionLink, useEffectiveActive } from "@/components/ui/FilterNavigation";

export type FilterChipItem = {
  label: string;
  href: string;
  /** Number shown beside the label, for example how many rows match. */
  count?: number;
  active: boolean;
};

/**
 * A row of filter links (All, Under review, Overdue, ...). Each one is a link,
 * so the filter lives in the address and survives a refresh or a shared link.
 * Inside `FilterNavigation` the clicked chip turns active at once.
 */
export function FilterChips({
  label,
  items,
}: Readonly<{
  /** Accessible name for the group, for example "Filter LPOs". */
  label: string;
  items: readonly FilterChipItem[];
}>) {
  const activeStates = useEffectiveActive(items);

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const active = activeStates[index] ?? item.active;
          return (
            <li key={item.href}>
              <FilterOptionLink
                href={item.href}
                active={active}
                className={active ? "filter-chip filter-chip-on" : "filter-chip"}
              >
                <span>{item.label}</span>
                {item.count === undefined ? null : (
                  <span className="filter-chip-count">{item.count}</span>
                )}
              </FilterOptionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
