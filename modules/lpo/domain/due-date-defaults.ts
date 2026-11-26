/**
 * Default LPO due-date offsets, kept free of Prisma imports so that the forms
 * (which run in the browser) can show the dates before an LPO is saved.
 */

/** Manufacturer assignment default: received + 2 days. */
export const DEFAULT_ASSIGNMENT_DAYS = 2;

/** Manufacturer production deadline default: received + 12 days. */
export const DEFAULT_PRODUCTION_DEADLINE_DAYS = 12;

/** Client delivery default: received + 15 days. */
export const DEFAULT_CLIENT_DELIVERY_DAYS = 15;

export type DueDatePreview = {
  assignment: string;
  productionDeadline: string;
  clientDelivery: string;
};

function addCalendarDays(yyyyMmDd: string, days: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!match) {
    return null;
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The three due dates an LPO will get for a received date (YYYY-MM-DD), as
 * readable dates such as "14 Nov 2026". Null while the received date is empty
 * or not a real date.
 */
export function previewDueDates(receivedYmd: string): DueDatePreview | null {
  const assignment = addCalendarDays(receivedYmd, DEFAULT_ASSIGNMENT_DAYS);
  const productionDeadline = addCalendarDays(
    receivedYmd,
    DEFAULT_PRODUCTION_DEADLINE_DAYS,
  );
  const clientDelivery = addCalendarDays(receivedYmd, DEFAULT_CLIENT_DELIVERY_DAYS);
  if (!assignment || !productionDeadline || !clientDelivery) {
    return null;
  }
  return { assignment, productionDeadline, clientDelivery };
}
