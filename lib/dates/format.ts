import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";

/** Calendar day (received date). */
export function formatCalendarDate(date: Date): string {
  return format(date, "dd MMM yyyy");
}

/** Business due timestamps in Asia/Dubai. */
export function formatBusinessDateTime(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "dd MMM yyyy HH:mm");
}

/** A business due date in Asia/Dubai, without the time ("14 Nov 2026"). */
export function formatBusinessDate(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "d MMM yyyy");
}
