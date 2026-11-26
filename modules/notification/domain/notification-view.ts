/**
 * Pure helpers for the Notifications page: what each reminder is called, what
 * the action button says, and the All / Unread filter. Strings are used for the
 * type (not the Prisma enum) so client components and tests can import this.
 */

export type NotificationTone = "red" | "amber" | "gray";

const KINDS: Record<string, { label: string; tone: NotificationTone }> = {
  REVIEW_PENDING: { label: "Review pending", tone: "amber" },
  ASSIGNMENT_OVERDUE: { label: "Assignment overdue", tone: "red" },
  PRODUCTION_OVERDUE: { label: "Production overdue", tone: "red" },
  CLIENT_DELIVERY_OVERDUE: { label: "Client delivery overdue", tone: "red" },
};

export function notificationKind(type: string): {
  label: string;
  tone: NotificationTone;
} {
  return KINDS[type] ?? { label: type.replaceAll("_", " ").toLowerCase(), tone: "gray" };
}

/** The `action` the link opens on the LPO page, or null when there is none. */
export function actionFromPath(actionPath: string): string | null {
  const query = actionPath.split("?")[1];
  if (!query) {
    return null;
  }
  return new URLSearchParams(query).get("action");
}

const ACTION_LABELS: Record<string, string> = {
  assign: "Assign manufacturer",
  dates: "Extend a date",
  complete: "Mark delivery completed",
};

/** Button text: a review reminder just opens the LPO; the others name the fix. */
export function notificationActionLabel(type: string, actionPath: string): string {
  if (type === "REVIEW_PENDING") {
    return "Open LPO";
  }
  const action = actionFromPath(actionPath);
  return (action ? ACTION_LABELS[action] : undefined) ?? "Open LPO";
}

export type NotificationView = "all" | "unread";

export function parseNotificationView(
  value: string | null | undefined,
): NotificationView {
  return value === "unread" ? "unread" : "all";
}

export function countUnread(items: ReadonlyArray<{ readAt: string | null }>): number {
  return items.filter((item) => !item.readAt).length;
}

export function filterByView<T extends { readAt: string | null }>(
  items: readonly T[],
  view: NotificationView,
): T[] {
  return view === "unread" ? items.filter((item) => !item.readAt) : [...items];
}
