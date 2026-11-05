import { LpoStatus, NotificationType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  actionForType,
  actionPathFor,
  isAssignmentOverdue,
  isClientDeliveryOverdue,
  isProductionOverdue,
  isReviewPending,
  overdueDedupeKey,
  pendingDedupeKey,
} from "@/modules/notification/domain/due-notification-rules";
import { absoluteAppUrl, getAppBaseUrl } from "@/lib/app-url";

const baseLpo = {
  id: "lpo1",
  lpoNumber: "45892",
  nickname: "ABC Hotel",
  status: LpoStatus.UNDER_REVIEW,
  manufacturerAssignmentAt: new Date("2026-08-01T19:59:59.999Z"),
  productionDeadlineAt: new Date("2026-08-20T19:59:59.999Z"),
  clientDeliveryAt: new Date("2026-08-25T19:59:59.999Z"),
  manufacturerName: null,
};

describe("due notification rules", () => {
  it("maps types to action deep links", () => {
    expect(
      actionPathFor(NotificationType.REVIEW_PENDING, "abc", LpoStatus.UNDER_REVIEW),
    ).toBe("/lpo/abc?action=assign");
    expect(
      actionForType(
        NotificationType.PRODUCTION_OVERDUE,
        LpoStatus.ASSIGNED_TO_MANUFACTURER,
      ),
    ).toBe("dates");
    expect(
      actionForType(
        NotificationType.CLIENT_DELIVERY_OVERDUE,
        LpoStatus.ASSIGNED_TO_MANUFACTURER,
      ),
    ).toBe("complete");
  });

  it("routes an overdue client delivery back to assignment when the LPO was never assigned", () => {
    // Regression test: a client-delivery date can lapse while an LPO is
    // still Under Review. "Mark client delivery completed" doesn't exist
    // as a control until a manufacturer is assigned (see
    // canMarkClientDeliveryCompleted), so the deep link must send the user
    // to "assign" instead of "complete" in that case — otherwise it lands
    // on a URL with no matching section on the page.
    expect(
      actionForType(NotificationType.CLIENT_DELIVERY_OVERDUE, LpoStatus.UNDER_REVIEW),
    ).toBe("assign");
    expect(
      actionPathFor(
        NotificationType.CLIENT_DELIVERY_OVERDUE,
        "abc",
        LpoStatus.UNDER_REVIEW,
      ),
    ).toBe("/lpo/abc?action=assign");
  });

  it("detects review pending and overdues", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    expect(isReviewPending(baseLpo)).toBe(true);
    expect(isAssignmentOverdue(baseLpo, now)).toBe(true);
    expect(
      isProductionOverdue(
        { ...baseLpo, status: LpoStatus.ASSIGNED_TO_MANUFACTURER },
        now,
      ),
    ).toBe(false);
    expect(
      isProductionOverdue(
        {
          ...baseLpo,
          status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
          productionDeadlineAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(isClientDeliveryOverdue(baseLpo, now)).toBe(false);
    expect(
      isClientDeliveryOverdue(
        {
          ...baseLpo,
          clientDeliveryAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isClientDeliveryOverdue(
        {
          ...baseLpo,
          status: LpoStatus.CLIENT_DELIVERY_COMPLETED,
          clientDeliveryAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("builds stable dedupe keys", () => {
    const due = new Date("2026-08-01T19:59:59.999Z");
    expect(overdueDedupeKey("l1", NotificationType.PRODUCTION_OVERDUE, due)).toBe(
      `l1:PRODUCTION_OVERDUE:${due.toISOString()}`,
    );
    expect(pendingDedupeKey("l1", NotificationType.REVIEW_PENDING, "2026-08-11")).toBe(
      "l1:REVIEW_PENDING:2026-08-11",
    );
  });
});

describe("app url", () => {
  it("joins base and path", () => {
    const base = getAppBaseUrl();
    expect(absoluteAppUrl("/lpo/x?action=assign")).toBe(`${base}/lpo/x?action=assign`);
  });
});
