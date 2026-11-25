import { LpoStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  attentionFor,
  summariseToday,
  upcomingFor,
  type TodayLpo,
} from "@/modules/lpo/domain/today";
import { nextStepFor } from "@/modules/lpo/domain/lpo-detail";
import {
  lpoFilterWhere,
  LPO_FILTERS,
  parseLpoFilter,
} from "@/modules/lpo/domain/lpo-filters";
import {
  assertCanMarkClientDeliveryCompleted,
  canMarkClientDeliveryCompleted,
} from "@/modules/lpo/domain/lpo-status";
import {
  formatUrgentLpoNumber,
  looksLikeUrgentLpoNumber,
} from "@/modules/lpo/domain/urgent-lpo";
import {
  isAssignmentOverdue,
  isClientDeliveryOverdue,
  isProductionOverdue,
  isReviewPending,
} from "@/modules/notification/domain/due-notification-rules";

// Thursday 5 November 2026, 10:00 in Dubai.
const NOW = new Date("2026-11-05T06:00:00.000Z");

function urgent(overrides: Partial<TodayLpo> = {}): TodayLpo {
  return {
    id: "u1",
    lpoNumber: "URGENT_5",
    nickname: "Rush Aprons",
    clientName: "Palm Cafe",
    status: LpoStatus.UNDER_REVIEW,
    isUrgent: true,
    manufacturerAssignmentAt: null,
    productionDeadlineAt: null,
    clientDeliveryAt: null,
    manufacturerName: null,
    ...overrides,
  };
}

describe("urgent LPO numbers", () => {
  it("formats the generated number", () => {
    expect(formatUrgentLpoNumber(1)).toBe("URGENT_1");
    expect(formatUrgentLpoNumber(12)).toBe("URGENT_12");
  });

  it("rejects a counter that is not a whole number from 1", () => {
    expect(() => formatUrgentLpoNumber(0)).toThrow();
    expect(() => formatUrgentLpoNumber(1.5)).toThrow();
  });

  it("recognises generated-looking numbers so they cannot be typed by hand", () => {
    expect(looksLikeUrgentLpoNumber("URGENT_7")).toBe(true);
    expect(looksLikeUrgentLpoNumber(" urgent_7 ")).toBe(true);
    expect(looksLikeUrgentLpoNumber("45892")).toBe(false);
    expect(looksLikeUrgentLpoNumber("URGENT_ABC")).toBe(false);
  });
});

describe("urgent LPOs and reminders", () => {
  it("are never review-pending or overdue, with or without dates", () => {
    const noDates = urgent();
    expect(isReviewPending(noDates)).toBe(false);
    expect(isAssignmentOverdue(noDates, NOW)).toBe(false);
    expect(isProductionOverdue(noDates, NOW)).toBe(false);
    expect(isClientDeliveryOverdue(noDates, NOW)).toBe(false);

    const past = new Date("2026-01-01T19:59:59.999Z");
    const withOldDates = urgent({
      manufacturerAssignmentAt: past,
      productionDeadlineAt: past,
      clientDeliveryAt: past,
      status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
    });
    expect(isAssignmentOverdue(withOldDates, NOW)).toBe(false);
    expect(isProductionOverdue(withOldDates, NOW)).toBe(false);
    expect(isClientDeliveryOverdue(withOldDates, NOW)).toBe(false);
  });

  it("stay off the Today attention and upcoming lists", () => {
    expect(attentionFor(urgent(), NOW)).toBeNull();
    expect(
      upcomingFor(urgent({ status: LpoStatus.ASSIGNED_TO_MANUFACTURER }), NOW),
    ).toEqual([]);
    const summary = summariseToday([urgent()], NOW);
    expect(summary.attention).toEqual([]);
    expect(summary.upcoming).toEqual([]);
    expect(summary.overdue).toBe(0);
  });
});

describe("urgent LPO delivery rules", () => {
  const assigned = {
    status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
    manufacturerId: "m1",
    productionFileKey: null,
  };

  it("can be completed without a production file", () => {
    expect(canMarkClientDeliveryCompleted({ ...assigned, isUrgent: true })).toBe(true);
    expect(() =>
      assertCanMarkClientDeliveryCompleted({ ...assigned, isUrgent: true }),
    ).not.toThrow();
  });

  it("still needs the production file for a normal LPO", () => {
    expect(canMarkClientDeliveryCompleted(assigned)).toBe(false);
    expect(canMarkClientDeliveryCompleted({ ...assigned, isUrgent: false })).toBe(false);
  });

  it("still needs a manufacturer", () => {
    expect(
      canMarkClientDeliveryCompleted({
        ...assigned,
        manufacturerId: null,
        isUrgent: true,
      }),
    ).toBe(false);
  });
});

describe("urgent filter and copy", () => {
  it("adds an Urgent filter that matches only urgent LPOs", () => {
    expect(LPO_FILTERS.map((f) => f.key)).toContain("urgent");
    expect(parseLpoFilter("urgent")).toBe("urgent");
    expect(lpoFilterWhere("urgent", NOW)).toEqual({ isUrgent: true });
  });

  it("explains the urgent flow without production files or deadlines", () => {
    expect(nextStepFor("UNDER_REVIEW", true).body).toContain("no reminders");
    expect(nextStepFor("ASSIGNED_TO_MANUFACTURER", true).body).toContain(
      "No production file",
    );
    expect(nextStepFor("UNDER_REVIEW").body).toContain("production PDF");
  });
});
