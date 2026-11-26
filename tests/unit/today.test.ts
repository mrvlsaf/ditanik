import { LpoStatus, NotificationType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  agoLabel,
  attentionFor,
  businessDaysBetween,
  summariseToday,
  upcomingFor,
  type TodayLpo,
} from "@/modules/lpo/domain/today";

// Thursday 5 November 2026, 10:00 in Dubai (06:00 UTC).
const NOW = new Date("2026-11-05T06:00:00.000Z");

/** End of a Dubai business day, as the app stores due dates. */
function endOfDubaiDay(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T19:59:59.999Z`);
}

function lpo(overrides: Partial<TodayLpo> = {}): TodayLpo {
  return {
    id: "lpo1",
    lpoNumber: "45892",
    nickname: "ABC Hotel",
    clientName: "ABC Hotel Uniform",
    status: LpoStatus.UNDER_REVIEW,
    manufacturerAssignmentAt: endOfDubaiDay("2026-11-10"),
    productionDeadlineAt: endOfDubaiDay("2026-11-20"),
    clientDeliveryAt: endOfDubaiDay("2026-11-25"),
    manufacturerName: null,
    ...overrides,
  };
}

describe("businessDaysBetween", () => {
  it("counts whole Dubai days", () => {
    expect(businessDaysBetween(endOfDubaiDay("2026-11-03"), NOW)).toBe(2);
    expect(businessDaysBetween(NOW, endOfDubaiDay("2026-11-05"))).toBe(0);
    expect(businessDaysBetween(NOW, endOfDubaiDay("2026-11-12"))).toBe(7);
  });

  it("uses the Dubai day, not the UTC day, near midnight", () => {
    // 21:30 UTC on the 5th is 01:30 on the 6th in Dubai.
    const lateUtc = new Date("2026-11-05T21:30:00.000Z");
    expect(businessDaysBetween(NOW, lateUtc)).toBe(1);
  });
});

describe("agoLabel", () => {
  it("words the gap", () => {
    expect(agoLabel(0)).toBe("earlier today");
    expect(agoLabel(1)).toBe("yesterday");
    expect(agoLabel(3)).toBe("3 days ago");
  });
});

describe("attentionFor", () => {
  it("lists an Under review LPO that is not late as a pending review", () => {
    const item = attentionFor(lpo(), NOW);
    expect(item).toMatchObject({
      type: NotificationType.REVIEW_PENDING,
      tone: "amber",
      actionLabel: "Assign manufacturer",
      actionHref: "/lpo/lpo1?action=assign",
    });
  });

  it("flags a passed assignment date", () => {
    const item = attentionFor(
      lpo({ manufacturerAssignmentAt: endOfDubaiDay("2026-11-04") }),
      NOW,
    );
    expect(item?.type).toBe(NotificationType.ASSIGNMENT_OVERDUE);
    expect(item?.tone).toBe("red");
    expect(item?.reason).toBe("Assignment overdue by 1 day");
  });

  it("flags a passed production deadline with the date-change action", () => {
    const item = attentionFor(
      lpo({
        status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
        manufacturerName: "Al Noor",
        productionDeadlineAt: endOfDubaiDay("2026-11-03"),
      }),
      NOW,
    );
    expect(item).toMatchObject({
      type: NotificationType.PRODUCTION_OVERDUE,
      reason: "Production deadline passed 2 days ago",
      actionLabel: "Extend a date",
      actionHref: "/lpo/lpo1?action=dates",
    });
  });

  it("puts a passed client delivery first, and routes to completing it", () => {
    const item = attentionFor(
      lpo({
        status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
        productionDeadlineAt: endOfDubaiDay("2026-11-02"),
        clientDeliveryAt: endOfDubaiDay("2026-11-04"),
      }),
      NOW,
    );
    expect(item).toMatchObject({
      type: NotificationType.CLIENT_DELIVERY_OVERDUE,
      reason: "Client delivery date was yesterday",
      actionLabel: "Mark delivery completed",
    });
  });

  it("sends a late delivery on an unassigned LPO to assignment first", () => {
    const item = attentionFor(
      lpo({ clientDeliveryAt: endOfDubaiDay("2026-11-04") }),
      NOW,
    );
    expect(item?.type).toBe(NotificationType.CLIENT_DELIVERY_OVERDUE);
    expect(item?.actionLabel).toBe("Assign manufacturer");
  });

  it("ignores an assigned LPO that is on track", () => {
    expect(
      attentionFor(lpo({ status: LpoStatus.ASSIGNED_TO_MANUFACTURER }), NOW),
    ).toBeNull();
  });
});

describe("upcomingFor", () => {
  const assigned = lpo({
    status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
    manufacturerName: "Al Noor Tailoring",
  });

  it("includes production and delivery dates inside the next 7 days", () => {
    const items = upcomingFor(
      {
        ...assigned,
        productionDeadlineAt: endOfDubaiDay("2026-11-06"),
        clientDeliveryAt: endOfDubaiDay("2026-11-09"),
      },
      NOW,
    );
    expect(items.map((item) => item.kind)).toEqual([
      "PRODUCTION_DEADLINE",
      "CLIENT_DELIVERY",
    ]);
    expect(items[0]).toMatchObject({
      dateLabel: "Fri 6 Nov",
      who: "Al Noor Tailoring",
    });
  });

  it("includes a date due later today but not one already passed", () => {
    expect(
      upcomingFor(
        { ...assigned, productionDeadlineAt: endOfDubaiDay("2026-11-05") },
        NOW,
      ).map((item) => item.kind),
    ).toContain("PRODUCTION_DEADLINE");
    expect(
      upcomingFor(
        { ...assigned, productionDeadlineAt: endOfDubaiDay("2026-11-04") },
        NOW,
      ).map((item) => item.kind),
    ).not.toContain("PRODUCTION_DEADLINE");
  });

  it("leaves out dates beyond the window and completed LPOs", () => {
    expect(upcomingFor(assigned, NOW)).toEqual([]);
    expect(
      upcomingFor(
        lpo({
          status: LpoStatus.CLIENT_DELIVERY_COMPLETED,
          clientDeliveryAt: endOfDubaiDay("2026-11-06"),
        }),
        NOW,
      ),
    ).toEqual([]);
  });

  it("does not list a production deadline before a manufacturer is assigned", () => {
    const items = upcomingFor(
      lpo({
        productionDeadlineAt: endOfDubaiDay("2026-11-06"),
        clientDeliveryAt: endOfDubaiDay("2026-11-07"),
      }),
      NOW,
    );
    expect(items.map((item) => item.kind)).toEqual(["CLIENT_DELIVERY"]);
    expect(items[0]?.who).toBe("Not assigned yet");
  });
});

describe("summariseToday", () => {
  it("counts, orders and separates what needs action from what is coming", () => {
    const summary = summariseToday(
      [
        lpo({ id: "review" }),
        lpo({
          id: "late-delivery",
          status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
          clientDeliveryAt: endOfDubaiDay("2026-11-04"),
        }),
        lpo({
          id: "late-production",
          status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
          productionDeadlineAt: endOfDubaiDay("2026-11-01"),
        }),
        lpo({
          id: "on-track",
          status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
          productionDeadlineAt: endOfDubaiDay("2026-11-07"),
        }),
      ],
      NOW,
    );

    expect(summary.underReview).toBe(1);
    expect(summary.withManufacturers).toBe(3);
    expect(summary.overdue).toBe(2);
    // Most overdue first, plain review last.
    expect(summary.attention.map((item) => item.lpoId)).toEqual([
      "late-production",
      "late-delivery",
      "review",
    ]);
    expect(summary.upcoming.map((item) => item.lpoId)).toEqual(["on-track"]);
  });
});
