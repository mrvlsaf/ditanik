"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { withRequestNonce } from "@/lib/with-request-nonce";
import {
  countUnread,
  filterByView,
  notificationActionLabel,
  notificationKind,
  type NotificationView,
} from "@/modules/notification/domain/notification-view";

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
  const [view, setView] = useState<NotificationView>("all");
  useGlobalPending(isPending);

  const unreadCount = countUnread(items);
  const shown = filterByView(items, view);

  function markRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  const filters: Array<{ key: NotificationView; label: string }> = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter notifications"
          className="flex flex-wrap gap-2.5"
        >
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-pressed={view === filter.key}
              onClick={() => setView(filter.key)}
              className={
                view === filter.key ? "filter-chip filter-chip-on" : "filter-chip"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            disabled={isPending}
            className="btn-secondary"
            onClick={() => {
              startTransition(async () => {
                await markAllNotificationsReadAction();
                router.refresh();
              });
            }}
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "You are all caught up" : "No unread notifications"}
        >
          {items.length === 0
            ? "New reminders appear here when an LPO needs attention."
            : "Every reminder has been read. Choose All to see them again."}
        </EmptyState>
      ) : (
        <section className="surface-card overflow-hidden" aria-label="Notification list">
          <ul>
            {shown.map((item) => {
              const unread = !item.readAt;
              const kind = notificationKind(item.type);
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-3.5 border-b border-[var(--border)] px-5 py-4 last:border-b-0 ${
                    unread ? "bg-[#fffaf0]" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={kind.tone}>{kind.label}</Chip>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {unread ? <Chip tone="gray">New</Chip> : null}
                    </div>
                    <p className="text-[15px] font-bold">{item.title}</p>
                    <p className="text-sm leading-relaxed text-[#3a413a]">{item.body}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      LPO {item.lpoNumber} · {item.nickname}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={item.actionPath}
                      onClick={(event) => {
                        // Force navigation with a fresh nonce even when this
                        // item's actionPath matches the URL already loaded:
                        // otherwise Next.js no-ops the navigation and the LPO
                        // page never reopens the right tab.
                        event.preventDefault();
                        if (unread) {
                          markRead(item.id);
                        }
                        router.push(withRequestNonce(item.actionPath), { scroll: false });
                      }}
                      className="btn-primary"
                    >
                      {notificationActionLabel(item.type, item.actionPath)}
                    </Link>
                    {unread ? (
                      <button
                        type="button"
                        disabled={isPending}
                        className="btn-secondary"
                        onClick={() => markRead(item.id)}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
