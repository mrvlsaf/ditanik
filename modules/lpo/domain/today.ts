import { LpoStatus, NotificationType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import {
  actionForType,
  actionPathFor,
  dubaiBusinessDayLabel,
  isAssignmentOverdue,
  isClientDeliveryOverdue,
  isProductionOverdue,
  isReviewPending,
  parseBusinessDayLabel,
  type LpoDueSnapshot,
  type NotificationAction,
} from "@/modules/notification/domain/due-notification-rules";

/** Days ahead (including today) shown under "Coming up". */
export const UPCOMING_DAYS = 7;

/** What the Today page needs to know about an open LPO. */
export type TodayLpo = LpoDueSnapshot & {
  clientName: string;
};

export type AttentionTone = "amber" | "red";

export type AttentionItem = {
  lpoId: string;
  lpoNumber: string;
  clientName: string;
  type: NotificationType;
  /** Why it is listed, for example "Production deadline passed 2 days ago". */
  reason: string;
  tone: AttentionTone;
  actionLabel: string;
  actionHref: string;
  /** Date the step was due, used to list the most overdue first. */
  dueAt: Date;
};

export type UpcomingKind = "PRODUCTION_DEADLINE" | "CLIENT_DELIVERY";

export type UpcomingItem = {
  lpoId: string;
  lpoNumber: string;
  clientName: string;
  kind: UpcomingKind;
  kindLabel: string;
  at: Date;
  /** Short date such as "Fri 6 Nov", in Dubai time. */
  dateLabel: string;
  /** Manufacturer name, or a note when none is assigned yet. */
  who: string;
};

export type TodaySummary = {
  underReview: number;
  withManufacturers: number;
  overdue: number;
  attention: AttentionItem[];
  upcoming: UpcomingItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole Dubai business days from `from` to `to` (negative when `to` is earlier). */
export function businessDaysBetween(from: Date, to: Date): number {
  const a = parseBusinessDayLabel(dubaiBusinessDayLabel(from)).getTime();
  const b = parseBusinessDayLabel(dubaiBusinessDayLabel(to)).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** "earlier today", "yesterday" or "3 days ago", for a date that has passed. */
export function agoLabel(days: number): string {
  if (days <= 0) {
    return "earlier today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return `${days} days ago`;
}

function actionLabelFor(action: NotificationAction): string {
  switch (action) {
    case "assign":
      return "Assign manufacturer";
    case "dates":
      return "Extend a date";
    case "complete":
      return "Mark delivery completed";
  }
}

/**
 * The single most pressing thing about an LPO, or null when nothing needs
 * doing today. A passed client delivery date outranks a passed production
 * deadline, which outranks a passed assignment date; a plain "Under review"
 * LPO that is not yet late is listed last.
 */
export function attentionFor(lpo: TodayLpo, now: Date): AttentionItem | null {
  let type: NotificationType;
  let reason: string;
  let tone: AttentionTone = "red";
  let dueAt: Date;

  if (isClientDeliveryOverdue(lpo, now)) {
    type = NotificationType.CLIENT_DELIVERY_OVERDUE;
    dueAt = lpo.clientDeliveryAt;
    reason = `Client delivery date was ${agoLabel(businessDaysBetween(dueAt, now))}`;
  } else if (isProductionOverdue(lpo, now)) {
    type = NotificationType.PRODUCTION_OVERDUE;
    dueAt = lpo.productionDeadlineAt;
    reason = `Production deadline passed ${agoLabel(businessDaysBetween(dueAt, now))}`;
  } else if (isAssignmentOverdue(lpo, now)) {
    type = NotificationType.ASSIGNMENT_OVERDUE;
    dueAt = lpo.manufacturerAssignmentAt;
    const days = businessDaysBetween(dueAt, now);
    reason =
      days <= 0
        ? "Assignment date passed earlier today"
        : `Assignment overdue by ${days} ${days === 1 ? "day" : "days"}`;
  } else if (isReviewPending(lpo)) {
    type = NotificationType.REVIEW_PENDING;
    tone = "amber";
    dueAt = lpo.manufacturerAssignmentAt;
    reason = "Review pending: not assigned yet";
  } else {
    return null;
  }

  return {
    lpoId: lpo.id,
    lpoNumber: lpo.lpoNumber,
    clientName: lpo.clientName,
    type,
    reason,
    tone,
    actionLabel: actionLabelFor(actionForType(type, lpo.status)),
    actionHref: actionPathFor(type, lpo.id, lpo.status),
    dueAt,
  };
}

export function isOverdue(lpo: TodayLpo, now: Date): boolean {
  return (
    isClientDeliveryOverdue(lpo, now) ||
    isProductionOverdue(lpo, now) ||
    isAssignmentOverdue(lpo, now)
  );
}

function withinWindow(at: Date, now: Date, days: number): boolean {
  if (at.getTime() < now.getTime()) {
    return false;
  }
  return businessDaysBetween(now, at) <= days;
}

/** Production deadlines and client deliveries that fall in the next `days` days. */
export function upcomingFor(
  lpo: TodayLpo,
  now: Date,
  days = UPCOMING_DAYS,
): UpcomingItem[] {
  if (lpo.status === LpoStatus.CLIENT_DELIVERY_COMPLETED) {
    return [];
  }
  const who = lpo.manufacturerName ?? "Not assigned yet";
  const items: UpcomingItem[] = [];

  const candidates: Array<{ kind: UpcomingKind; label: string; at: Date }> = [];
  if (lpo.status === LpoStatus.ASSIGNED_TO_MANUFACTURER) {
    candidates.push({
      kind: "PRODUCTION_DEADLINE",
      label: "Production deadline",
      at: lpo.productionDeadlineAt,
    });
  }
  candidates.push({
    kind: "CLIENT_DELIVERY",
    label: "Client delivery",
    at: lpo.clientDeliveryAt,
  });

  for (const candidate of candidates) {
    if (withinWindow(candidate.at, now, days)) {
      items.push({
        lpoId: lpo.id,
        lpoNumber: lpo.lpoNumber,
        clientName: lpo.clientName,
        kind: candidate.kind,
        kindLabel: candidate.label,
        at: candidate.at,
        dateLabel: formatInTimeZone(candidate.at, BUSINESS_TIMEZONE, "EEE d MMM"),
        who,
      });
    }
  }
  return items;
}

/** Everything the Today page shows, worked out from the open LPOs. */
export function summariseToday(lpos: readonly TodayLpo[], now: Date): TodaySummary {
  const attention: AttentionItem[] = [];
  const upcoming: UpcomingItem[] = [];
  let underReview = 0;
  let withManufacturers = 0;
  let overdue = 0;

  for (const lpo of lpos) {
    if (lpo.status === LpoStatus.UNDER_REVIEW) {
      underReview += 1;
    } else if (lpo.status === LpoStatus.ASSIGNED_TO_MANUFACTURER) {
      withManufacturers += 1;
    }
    if (isOverdue(lpo, now)) {
      overdue += 1;
    }
    const item = attentionFor(lpo, now);
    if (item) {
      attention.push(item);
    }
    upcoming.push(...upcomingFor(lpo, now));
  }

  // Late items first (most overdue at the top), then plain reviews.
  attention.sort((a, b) => {
    if (a.tone !== b.tone) {
      return a.tone === "red" ? -1 : 1;
    }
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
  upcoming.sort((a, b) => a.at.getTime() - b.at.getTime());

  return { underReview, withManufacturers, overdue, attention, upcoming };
}

/** "Thursday 5 November" in Dubai time. */
export function todayHeading(now: Date): string {
  return formatInTimeZone(now, BUSINESS_TIMEZONE, "EEEE d MMMM");
}
