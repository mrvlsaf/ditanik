"use client";

import { useEffect } from "react";

import type { NotificationAction } from "@/modules/notification/domain/due-notification-rules";

const SECTION_IDS: Record<NotificationAction, string> = {
  assign: "lpo-assign",
  dates: "lpo-dates",
  complete: "lpo-complete",
};

export function LpoDeepLinkFocus({
  action,
}: Readonly<{
  action: NotificationAction | null;
}>) {
  useEffect(() => {
    if (!action) {
      return;
    }

    const id = SECTION_IDS[action];
    const el =
      document.getElementById(id) ??
      (action === "complete" ? document.getElementById("lpo-assign") : null);
    if (!el) {
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2");
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2");
    };
  }, [action]);

  return null;
}
