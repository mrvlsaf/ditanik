import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { LpoDateField } from "@prisma/client";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import {
  DEFAULT_ASSIGNMENT_DAYS,
  DEFAULT_CLIENT_DELIVERY_DAYS,
  DEFAULT_PRODUCTION_DEADLINE_DAYS,
} from "@/modules/lpo/domain/due-date-defaults";

// The offsets live in a Prisma-free file so the forms can preview the dates in
// the browser; they are re-exported here so existing imports keep working.
export {
  DEFAULT_ASSIGNMENT_DAYS,
  DEFAULT_CLIENT_DELIVERY_DAYS,
  DEFAULT_PRODUCTION_DEADLINE_DAYS,
} from "@/modules/lpo/domain/due-date-defaults";

const MIN_REASON_LENGTH = 10;

export const MIN_DATE_CHANGE_REASON_LENGTH = MIN_REASON_LENGTH;

/**
 * receivedDate + days, at 23:59:59.999 in Asia/Dubai, stored as UTC Date.
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
  return fromZonedTime(`${dueDateLabel}T23:59:59.999`, BUSINESS_TIMEZONE);
}

/** Calendar day (YYYY-MM-DD) → 23:59:59.999 Asia/Dubai as UTC. */
export function calculateDueAtFromCalendarDate(yyyyMmDd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) {
    throw new Error("Date must be YYYY-MM-DD.");
  }
  return fromZonedTime(`${yyyyMmDd}T23:59:59.999`, BUSINESS_TIMEZONE);
}

/** Noon Dubai for calendar @db.Date fields (LPO date / received date). */
export function parseCalendarDateInput(yyyyMmDd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) {
    throw new Error("Date must be YYYY-MM-DD.");
  }
  return fromZonedTime(`${yyyyMmDd}T12:00:00.000`, BUSINESS_TIMEZONE);
}

export function isReceivedDateAllowed(receivedDate: Date, now = new Date()): boolean {
  const receivedLabel = format(toZonedTime(receivedDate, BUSINESS_TIMEZONE), "yyyy-MM-dd");
  const todayLabel = format(toZonedTime(now, BUSINESS_TIMEZONE), "yyyy-MM-dd");
  return receivedLabel <= todayLabel;
}

function isDateChangeReasonValid(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH;
}

/** Assignment + production deadline require a reason; client delivery does not. */
export function isReasonRequiredForDateField(field: LpoDateField): boolean {
  return (
    field === LpoDateField.ASSIGNMENT ||
    field === LpoDateField.PRODUCTION_DEADLINE
  );
}

export function assertDateChangeReason(
  field: LpoDateField,
  reason: string | null | undefined,
): void {
  const trimmed = (reason ?? "").trim();
  if (isReasonRequiredForDateField(field)) {
    if (!isDateChangeReasonValid(trimmed)) {
      throw new Error(
        `Reason is required (min ${MIN_REASON_LENGTH} characters) for this date change.`,
      );
    }
  }
}

export function defaultLpoDatesFromReceived(receivedDate: Date) {
  return {
    manufacturerAssignmentAt: calculateDueAtFromReceivedDate(
      receivedDate,
      DEFAULT_ASSIGNMENT_DAYS,
    ),
    productionDeadlineAt: calculateDueAtFromReceivedDate(
      receivedDate,
      DEFAULT_PRODUCTION_DEADLINE_DAYS,
    ),
    clientDeliveryAt: calculateDueAtFromReceivedDate(
      receivedDate,
      DEFAULT_CLIENT_DELIVERY_DAYS,
    ),
  };
}
