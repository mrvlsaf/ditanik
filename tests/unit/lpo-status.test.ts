import { LpoStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertLpoTransition,
  canMarkLpoAsDelivered,
  canMarkLpoAsReviewed,
  nextStatusForTransition,
} from "@/modules/lpo/domain/lpo-status";

describe("lpo status machine", () => {
  it("blocks Reviewed without a review PDF", () => {
    expect(
      canMarkLpoAsReviewed({
        status: LpoStatus.PENDING,
        reviewFileKey: null,
      }),
    ).toBe(false);
  });

  it("allows Reviewed when Pending and review PDF exists", () => {
    expect(
      canMarkLpoAsReviewed({
        status: LpoStatus.PENDING,
        reviewFileKey: "files/review.pdf",
      }),
    ).toBe(true);
  });

  it("only allows Delivered from Reviewed", () => {
    expect(canMarkLpoAsDelivered(LpoStatus.PENDING)).toBe(false);
    expect(canMarkLpoAsDelivered(LpoStatus.REVIEWED)).toBe(true);
    expect(canMarkLpoAsDelivered(LpoStatus.DELIVERED)).toBe(false);
  });

  it("maps transitions to next status", () => {
    expect(nextStatusForTransition("mark_reviewed")).toBe(LpoStatus.REVIEWED);
    expect(nextStatusForTransition("mark_delivered")).toBe(LpoStatus.DELIVERED);
  });

  it("throws on illegal transitions", () => {
    expect(() =>
      assertLpoTransition(
        { status: LpoStatus.PENDING, reviewFileKey: null },
        "mark_reviewed",
      ),
    ).toThrow(/review PDF/i);

    expect(() =>
      assertLpoTransition(
        { status: LpoStatus.PENDING, reviewFileKey: "x" },
        "mark_delivered",
      ),
    ).toThrow(/Reviewed/i);
  });
});
