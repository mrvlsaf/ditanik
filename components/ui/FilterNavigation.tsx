"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";

import { ResultsSkeleton } from "@/components/ui/ResultsSkeleton";

/** Wait this long before swapping results for a skeleton, so fast loads do not flash. */
const SKELETON_DELAY_MS = 100;

type FilterNavigationValue = {
  isPending: boolean;
  /** The address just clicked; null once the new page has loaded. */
  pendingHref: string | null;
  navigate: (href: string, options?: { scroll?: boolean }) => void;
};

const FilterNavigationContext = createContext<FilterNavigationValue | null>(null);

/**
 * Wraps a filterable list. Filter links and forms inside it navigate in a
 * transition, so the clicked filter turns active at once and `PendingRegion`
 * shows a loader until the server sends the new results.
 */
export function FilterNavigation({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useOptimistic<string | null, string>(
    null,
    (_current, next) => next,
  );

  function navigate(href: string, options?: { scroll?: boolean }) {
    startTransition(() => {
      setPendingHref(href);
      router.push(href, { scroll: options?.scroll ?? false });
    });
  }

  return (
    <FilterNavigationContext.Provider value={{ isPending, pendingHref, navigate }}>
      {children}
    </FilterNavigationContext.Provider>
  );
}

function useFilterNavigation() {
  return useContext(FilterNavigationContext);
}

/** Click handler for a filter link; plain clicks navigate in a transition, others fall through. */
function useFilterClick() {
  const nav = useFilterNavigation();
  return (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    options?: { scroll?: boolean },
  ) => {
    if (
      !nav ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    nav.navigate(href, options);
  };
}

/**
 * Which option in a group counts as active: the clicked one while loading,
 * otherwise the one the server marked active.
 */
export function useEffectiveActive(
  items: readonly { href: string; active: boolean }[],
): boolean[] {
  const nav = useFilterNavigation();
  const pending = nav?.pendingHref ?? null;
  const pendingItem = pending ? items.find((item) => item.href === pending) : undefined;
  return items.map((item) => (pendingItem ? item === pendingItem : item.active));
}

/** A link inside `FilterNavigation` (Clear, Previous, Next, ...) that shows the loader. */
export function FilterLink({
  href,
  className,
  scroll,
  children,
}: Readonly<{
  href: string;
  className?: string;
  /** Scroll to the top after loading (for paging). Filters keep their place. */
  scroll?: boolean;
  children: React.ReactNode;
}>) {
  const onClick = useFilterClick();
  const nav = useFilterNavigation();
  return (
    <Link
      href={href}
      className={className}
      scroll={scroll}
      data-no-global-loader={nav ? "" : undefined}
      onClick={(event) => onClick(event, href, { scroll })}
    >
      {children}
    </Link>
  );
}

/** Link for one option in a group; pair with `useEffectiveActive`. */
export function FilterOptionLink({
  href,
  active,
  className,
  children,
}: Readonly<{
  href: string;
  active: boolean;
  className: string;
  children: React.ReactNode;
}>) {
  const onClick = useFilterClick();
  const nav = useFilterNavigation();
  return (
    <Link
      href={href}
      data-no-global-loader={nav ? "" : undefined}
      aria-current={active ? "true" : undefined}
      className={className}
      onClick={(event) => onClick(event, href)}
    >
      {children}
    </Link>
  );
}

/** A GET form (Search, Apply) that loads its results with the loader instead of reloading the page. */
export function FilterForm({
  action,
  className,
  children,
}: Readonly<{
  action: string;
  className?: string;
  children: React.ReactNode;
}>) {
  const nav = useFilterNavigation();
  return (
    <form
      method="get"
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!nav) {
          return;
        }
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) {
          if (typeof value === "string" && value.trim() !== "") {
            params.set(key, value.trim());
          }
        }
        const query = params.toString();
        nav.navigate(query ? `${action}?${query}` : action);
      }}
    >
      {children}
    </form>
  );
}

function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!value) {
      return;
    }
    const timer = setTimeout(() => setDelayed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setDelayed(false);
    };
  }, [value, delayMs]);
  return value && delayed;
}

/**
 * The results of a filterable list. While new results load it dims the old ones
 * at once, then swaps in a skeleton so stale rows are never mistaken for the new filter.
 */
export function PendingRegion({
  children,
  skeleton,
}: Readonly<{
  children: React.ReactNode;
  /** Replaces the default skeleton while loading. */
  skeleton?: React.ReactNode;
}>) {
  const nav = useFilterNavigation();
  const isPending = nav?.isPending ?? false;
  const showSkeleton = useDelayedTrue(isPending, SKELETON_DELAY_MS);

  return (
    <div aria-busy={isPending}>
      {showSkeleton ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading results…</span>
          {skeleton ?? <ResultsSkeleton />}
        </div>
      ) : (
        <div
          className={
            isPending ? "pointer-events-none opacity-60 transition-opacity" : undefined
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
