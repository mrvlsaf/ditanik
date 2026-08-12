"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notification/application/notification-actions";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  actionPath: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  lpoNumber: string;
  nickname: string;
};

export function NotificationsList({
  items,
}: Readonly<{
  items: NotificationListItem[];
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="surface-card px-4 py-8 text-center text-sm text-zinc-500">
        No notifications yet. The daily cron creates them when LPOs need action.
      </p>
    );
  }

  const hasUnread = items.some((item) => !item.readAt);

  return (
    <div className="space-y-3">
      {hasUnread ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isPending}
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                await markAllNotificationsReadAction();
                router.refresh();
              });
            }}
          >
            Mark all as read
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-zinc-100 overflow-hidden surface-card">
        {items.map((item) => {
          const unread = !item.readAt;
          return (
            <li key={item.id}>
              <div
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${
                  unread ? "bg-amber-50/50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{item.body}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    LPO {item.lpoNumber} · {item.nickname} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={item.actionPath}
                    onClick={() => {
                      if (unread) {
                        startTransition(async () => {
                          await markNotificationReadAction(item.id);
                          router.refresh();
                        });
                      }
                    }}
                    className="btn-primary"
                  >
                    Open
                  </Link>
                  {unread ? (
                    <button
                      type="button"
                      disabled={isPending}
                      className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                      onClick={() => {
                        startTransition(async () => {
                          await markNotificationReadAction(item.id);
                          router.refresh();
                        });
                      }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
