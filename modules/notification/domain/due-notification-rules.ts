import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { LpoStatus, NotificationType } from "@prisma/client";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";

export type LpoDueSnapshot = {
  id: string;
  lpoNumber: string;
  nickname: string;
  status: LpoStatus;
  /** Null for urgent LPOs, which have no planned dates. */
  manufacturerAssignmentAt: Date | null;
  productionDeadlineAt: Date | null;
  clientDeliveryAt: Date | null;
  /** Urgent LPOs never get reminders or overdue flags. */
  isUrgent?: boolean;
  manufacturerName?: string | null;
};

/**
 * A date that the overdue rules have just confirmed is set. Reminders only
 * ever fire for normal LPOs, which always have all three dates.
 */
export function requireDate(value: Date | null): Date {
  if (!value) {
    throw new Error("Expected a planned date on this LPO.");
  }
  return value;
}

export type NotificationAction = "assign" | "dates" | "complete";

export function actionPathFor(
  type: NotificationType,
  lpoId: string,
  status: LpoStatus,
): string {
  const action = actionForType(type, status);
  return `/lpo/${lpoId}?action=${action}`;
}

/**
 * A client-delivery date can lapse before the LPO is assigned. "Mark client
 * delivery completed" only exists once assigned (canMarkClientDeliveryCompleted),
 * so CLIENT_DELIVERY_OVERDUE routes to "assign" in that case.
 */
export function actionForType(
  type: NotificationType,
  status: LpoStatus,
): NotificationAction {
  switch (type) {
    case NotificationType.REVIEW_PENDING:
    case NotificationType.ASSIGNMENT_OVERDUE:
      return "assign";
    case NotificationType.PRODUCTION_OVERDUE:
      return "dates";
    case NotificationType.CLIENT_DELIVERY_OVERDUE:
      return status === LpoStatus.ASSIGNED_TO_MANUFACTURER ? "complete" : "assign";
  }
}

export function dubaiBusinessDayLabel(now = new Date()): string {
  return format(toZonedTime(now, BUSINESS_TIMEZONE), "yyyy-MM-dd");
}

export function parseBusinessDayLabel(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

export function overdueDedupeKey(
  lpoId: string,
  type: NotificationType,
  dueAt: Date,
): string {
  return `${lpoId}:${type}:${dueAt.toISOString()}`;
}

export function pendingDedupeKey(
  lpoId: string,
  type: NotificationType,
  businessDayLabel: string,
): string {
  return `${lpoId}:${type}:${businessDayLabel}`;
}

export function isReviewPending(lpo: LpoDueSnapshot): boolean {
  return !lpo.isUrgent && lpo.status === LpoStatus.UNDER_REVIEW;
}

export function isAssignmentOverdue(lpo: LpoDueSnapshot, now: Date): boolean {
  return (
    !lpo.isUrgent &&
    lpo.manufacturerAssignmentAt !== null &&
    lpo.status === LpoStatus.UNDER_REVIEW &&
    lpo.manufacturerAssignmentAt.getTime() < now.getTime()
  );
}

export function isProductionOverdue(lpo: LpoDueSnapshot, now: Date): boolean {
  return (
    !lpo.isUrgent &&
    lpo.productionDeadlineAt !== null &&
    lpo.status === LpoStatus.ASSIGNED_TO_MANUFACTURER &&
    lpo.productionDeadlineAt.getTime() < now.getTime()
  );
}

export function isClientDeliveryOverdue(lpo: LpoDueSnapshot, now: Date): boolean {
  return (
    !lpo.isUrgent &&
    lpo.clientDeliveryAt !== null &&
    lpo.status !== LpoStatus.CLIENT_DELIVERY_COMPLETED &&
    lpo.clientDeliveryAt.getTime() < now.getTime()
  );
}

export function titleForType(type: NotificationType, lpoNumber: string): string {
  switch (type) {
    case NotificationType.REVIEW_PENDING:
      return `Review pending — LPO ${lpoNumber}`;
    case NotificationType.ASSIGNMENT_OVERDUE:
      return `Manufacturer assignment overdue — LPO ${lpoNumber}`;
    case NotificationType.PRODUCTION_OVERDUE:
      return `Production deadline overdue — LPO ${lpoNumber}`;
    case NotificationType.CLIENT_DELIVERY_OVERDUE:
      return `Client delivery overdue — LPO ${lpoNumber}`;
  }
}

export function bodyForType(type: NotificationType, lpo: LpoDueSnapshot): string {
  switch (type) {
    case NotificationType.REVIEW_PENDING:
      return `LPO ${lpo.lpoNumber} (${lpo.nickname}) is still under review. Assign a manufacturer when ready.`;
    case NotificationType.ASSIGNMENT_OVERDUE:
      return `LPO ${lpo.lpoNumber} (${lpo.nickname}) passed its manufacturer assignment date. Open the LPO to assign a manufacturer.`;
    case NotificationType.PRODUCTION_OVERDUE:
      return `LPO ${lpo.lpoNumber} (${lpo.nickname}) assigned to ${lpo.manufacturerName ?? "a manufacturer"} passed its production deadline. Review dates or follow up.`;
    case NotificationType.CLIENT_DELIVERY_OVERDUE:
      return lpo.status === LpoStatus.ASSIGNED_TO_MANUFACTURER
        ? `LPO ${lpo.lpoNumber} (${lpo.nickname}) passed its client delivery date and is not marked completed.`
        : `LPO ${lpo.lpoNumber} (${lpo.nickname}) passed its client delivery date but hasn't been assigned to a manufacturer yet. Assign one to get it moving.`;
  }
}
