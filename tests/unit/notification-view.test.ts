import { describe, expect, it } from "vitest";

import {
  actionFromPath,
  countUnread,
  filterByView,
  notificationActionLabel,
  notificationKind,
  parseNotificationView,
} from "@/modules/notification/domain/notification-view";

describe("notificationKind", () => {
  it("names each reminder and marks overdue ones red", () => {
    expect(notificationKind("PRODUCTION_OVERDUE")).toEqual({
      label: "Production overdue",
      tone: "red",
    });
    expect(notificationKind("REVIEW_PENDING").tone).toBe("amber");
    expect(notificationKind("SOMETHING_NEW")).toEqual({
      label: "something new",
      tone: "gray",
    });
  });
});

describe("notificationActionLabel", () => {
  it("reads the action from the link", () => {
    expect(actionFromPath("/lpo/abc?action=dates")).toBe("dates");
    expect(actionFromPath("/lpo/abc")).toBeNull();
    expect(notificationActionLabel("PRODUCTION_OVERDUE", "/lpo/abc?action=dates")).toBe(
      "Extend a date",
    );
    expect(
      notificationActionLabel("CLIENT_DELIVERY_OVERDUE", "/lpo/abc?action=complete"),
    ).toBe("Mark delivery completed");
    expect(notificationActionLabel("ASSIGNMENT_OVERDUE", "/lpo/abc?action=assign")).toBe(
      "Assign manufacturer",
    );
  });

  it("just opens the LPO for a review reminder or an unknown link", () => {
    expect(notificationActionLabel("REVIEW_PENDING", "/lpo/abc?action=assign")).toBe(
      "Open LPO",
    );
    expect(notificationActionLabel("PRODUCTION_OVERDUE", "/lpo/abc")).toBe("Open LPO");
  });
});

describe("unread filter", () => {
  const items = [
    { id: "a", readAt: null },
    { id: "b", readAt: "2026-11-01T00:00:00Z" },
    { id: "c", readAt: null },
  ];

  it("counts and filters unread items", () => {
    expect(countUnread(items)).toBe(2);
    expect(filterByView(items, "unread").map((i) => i.id)).toEqual(["a", "c"]);
    expect(filterByView(items, "all")).toHaveLength(3);
  });

  it("parses the view", () => {
    expect(parseNotificationView("unread")).toBe("unread");
    expect(parseNotificationView("other")).toBe("all");
    expect(parseNotificationView(null)).toBe("all");
  });
});
