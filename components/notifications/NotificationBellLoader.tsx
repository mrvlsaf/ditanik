import {
  NotificationBell,
  type BellNotificationItem,
} from "@/components/notifications/NotificationBell";
import {
  countUnreadNotifications,
  listRecentNotifications,
} from "@/modules/notification/application/notifications";

export function NotificationBellSkeleton() {
  return (
    <div
      className="inline-flex min-h-11 min-w-11 animate-pulse rounded-md border border-zinc-200 bg-zinc-100"
      aria-hidden
    />
  );
}

/** Streams bell data so the app shell is not blocked on Neon. */
export async function NotificationBellLoader() {
  const [unreadCount, recent] = await Promise.all([
    countUnreadNotifications(),
    listRecentNotifications(8),
  ]);

  const recentNotifications: BellNotificationItem[] = recent.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    actionPath: row.actionPath,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lpoNumber: row.lpo.lpoNumber,
  }));

  return (
    <NotificationBell
      unreadCount={unreadCount}
      recent={recentNotifications}
    />
  );
}
