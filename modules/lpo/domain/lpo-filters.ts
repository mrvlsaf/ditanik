import { LpoStatus, type Prisma } from "@prisma/client";

/** LPOs shown per page on the list. */
export const LPO_PAGE_SIZE = 25;

export const LPO_FILTERS = [
  { key: "all", label: "All" },
  { key: "under-review", label: "Under review" },
  { key: "with-manufacturers", label: "With manufacturer" },
  { key: "completed", label: "Client delivery completed" },
  { key: "overdue", label: "Overdue" },
] as const;

export type LpoFilterKey = (typeof LPO_FILTERS)[number]["key"];

/** The filter named in the address, or "all" for anything unknown. */
export function parseLpoFilter(value: string | string[] | undefined): LpoFilterKey {
  const first = Array.isArray(value) ? value[0] : value;
  const match = LPO_FILTERS.find((filter) => filter.key === first);
  return match ? match.key : "all";
}

/** The page named in the address: a whole number from 1, otherwise 1. */
export function parsePage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  const page = Number(first);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Which LPOs belong under a filter. "Overdue" mirrors the due-date rules the
 * reminders use: a delivery date passed on any open LPO, a production
 * deadline passed while assigned, or an assignment date passed while still
 * under review.
 */
export function lpoFilterWhere(filter: LpoFilterKey, now: Date): Prisma.LpoWhereInput {
  switch (filter) {
    case "all":
      return {};
    case "under-review":
      return { status: LpoStatus.UNDER_REVIEW };
    case "with-manufacturers":
      return { status: LpoStatus.ASSIGNED_TO_MANUFACTURER };
    case "completed":
      return { status: LpoStatus.CLIENT_DELIVERY_COMPLETED };
    case "overdue":
      return {
        status: { not: LpoStatus.CLIENT_DELIVERY_COMPLETED },
        OR: [
          { clientDeliveryAt: { lt: now } },
          {
            status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
            productionDeadlineAt: { lt: now },
          },
          {
            status: LpoStatus.UNDER_REVIEW,
            manufacturerAssignmentAt: { lt: now },
          },
        ],
      };
  }
}

export type PageWindow = {
  /** The page to show, kept within 1..totalPages. */
  page: number;
  totalPages: number;
  /** 1-based position of the first and last row on this page; 0 when empty. */
  from: number;
  to: number;
  skip: number;
};

/** Where a page sits in a list of `total` rows. */
export function pageWindow(
  requestedPage: number,
  total: number,
  pageSize = LPO_PAGE_SIZE,
): PageWindow {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const skip = (page - 1) * pageSize;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(total, skip + pageSize);
  return { page, totalPages, from, to, skip };
}

/** Address of a list view; the default filter and first page stay out of it. */
export function lpoListHref(filter: LpoFilterKey, page = 1): string {
  const params = new URLSearchParams();
  if (filter !== "all") {
    params.set("filter", filter);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/lpo?${query}` : "/lpo";
}
