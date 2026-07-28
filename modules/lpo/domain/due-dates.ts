import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";

/**
 * receivedDate + days, at 23:59:59.999 in Asia/Dubai, stored as UTC Date.
 * `receivedDate` is treated as a calendar date (YYYY-MM-DD in Dubai).
 */
export function calculateDueAtFromReceivedDate(
  receivedDate: Date,
  days: number,
): Date {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("Due days must be an integer of at least 1.");
  }

  const receivedInDubai = toZonedTime(receivedDate, BUSINESS_TIMEZONE);
  const dueCalendarDay = addDays(receivedInDubai, days);
  const dueDateLabel = format(dueCalendarDay, "yyyy-MM-dd");
  const endOfDayInDubai = `${dueDateLabel}T23:59:59.999`;

  return fromZonedTime(endOfDayInDubai, BUSINESS_TIMEZONE);
}

/** Default review window when creating an LPO. */
export const DEFAULT_REVIEW_DUE_DAYS = 2;

/** Default delivery window when creating an LPO. */
export const DEFAULT_DELIVERY_DUE_DAYS = 15;

/** Received date must be today or earlier (Dubai calendar day). */
export function isReceivedDateAllowed(receivedDate: Date, now = new Date()): boolean {
  const receivedLabel = format(toZonedTime(receivedDate, BUSINESS_TIMEZONE), "yyyy-MM-dd");
  const todayLabel = format(toZonedTime(now, BUSINESS_TIMEZONE), "yyyy-MM-dd");
  return receivedLabel <= todayLabel;
}

const MIN_JUSTIFICATION_LENGTH = 10;

export function isDueDateJustificationValid(justification: string): boolean {
  return justification.trim().length >= MIN_JUSTIFICATION_LENGTH;
}
