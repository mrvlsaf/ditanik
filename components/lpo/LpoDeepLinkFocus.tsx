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
  requestId,
}: Readonly<{
  action: NotificationAction | null;
  /**
   * A per-click nonce (see lib/with-request-nonce.ts) with no meaning of
   * its own. It's in the dependency array purely so that clicking the same
   * notification twice in a row — same action, already on this LPO's page
   * — re-runs this effect and re-scrolls/re-highlights even though `action`
   * itself didn't change between clicks.
   */
  requestId?: string | null;
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
  }, [action, requestId]);

  return null;
}
