"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { useNavigateWithLoader } from "@/components/ui/useNavigateWithLoader";
import { withRequestNonce } from "@/lib/with-request-nonce";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notification/application/notification-actions";

export type BellNotificationItem = {
  id: string;
  title: string;
  body: string;
  actionPath: string;
  readAt: string | null;
  createdAt: string;
  lpoNumber: string;
};

export function NotificationBell({
  unreadCount,
  recent,
}: Readonly<{
  unreadCount: number;
  recent: BellNotificationItem[];
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigate = useNavigateWithLoader();
  const [isPending, startTransition] = useTransition();
  useGlobalPending(isPending);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function refresh() {
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="btn-secondary relative min-h-11 min-w-11"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-current"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-4 top-[68px] z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Notifications
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={isPending}
                className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-hover)] disabled:opacity-60"
                onClick={() => {
                  startTransition(async () => {
                    await markAllNotificationsReadAction();
                    refresh();
                  });
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-[60dvh] overflow-y-auto sm:max-h-80">
              {recent.map((item) => {
                const unread = !item.readAt;
                return (
                  <li key={item.id} className="border-b border-zinc-50 last:border-0">
                    <Link
                      href={item.actionPath}
                      onClick={(event) => {
                        // Navigate with a fresh nonce so re-clicking the same notification still re-focuses (see with-request-nonce.ts).
                        event.preventDefault();
                        setOpen(false);
                        if (unread) {
                          startTransition(async () => {
                            await markNotificationReadAction(item.id);
                            refresh();
                          });
                        }
                        navigate(withRequestNonce(item.actionPath), { scroll: false });
                      }}
                      className={`block px-3 py-3 hover:bg-[var(--surface-muted)] ${
                        unread ? "bg-[var(--brand-muted)]/40" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        LPO {item.lpoNumber}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-zinc-100 px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
