import { describe, expect, it } from "vitest";

import {
  DEFAULT_DELIVERY_DUE_DAYS,
  DEFAULT_REVIEW_DUE_DAYS,
  calculateDueAtFromReceivedDate,
  isDueDateJustificationValid,
  isReceivedDateAllowed,
} from "@/modules/lpo/domain/due-dates";

describe("lpo due dates", () => {
  it("uses defaults of 2 and 15 days", () => {
    expect(DEFAULT_REVIEW_DUE_DAYS).toBe(2);
    expect(DEFAULT_DELIVERY_DUE_DAYS).toBe(15);
  });

  it("computes Dubai end-of-day as UTC", () => {
    // 2026-07-01 in Dubai + 2 days => 2026-07-03 23:59:59.999 Asia/Dubai
    const received = new Date("2026-07-01T08:00:00.000Z");
    const due = calculateDueAtFromReceivedDate(received, 2);

    expect(due.toISOString()).toBe("2026-07-03T19:59:59.999Z");
  });

  it("rejects invalid day counts", () => {
    const received = new Date("2026-07-01T00:00:00.000Z");
    expect(() => calculateDueAtFromReceivedDate(received, 0)).toThrow(/at least 1/);
  });

  it("allows past or today received dates in Dubai", () => {
    const now = new Date("2026-07-10T10:00:00.000Z");
    expect(isReceivedDateAllowed(new Date("2026-07-10T00:00:00.000Z"), now)).toBe(true);
    expect(isReceivedDateAllowed(new Date("2026-07-09T00:00:00.000Z"), now)).toBe(true);
    expect(isReceivedDateAllowed(new Date("2026-07-11T00:00:00.000Z"), now)).toBe(false);
  });

  it("requires justification of at least 10 characters", () => {
    expect(isDueDateJustificationValid("too short")).toBe(false);
    expect(isDueDateJustificationValid("Vendor asked for more time")).toBe(true);
  });
});
