import { describe, expect, it } from "vitest";

import {
  calculateMetersRemaining,
  normalizeVendorName,
} from "@/modules/fabric/domain/meters";
import { calculateDueAtFromCalendarDate } from "@/modules/lpo/domain/due-dates";

describe("calculateMetersRemaining", () => {
  it("subtracts delivered from received", () => {
    expect(calculateMetersRemaining(100, 35.5)).toBe(64.5);
  });

  it("rejects delivered greater than received", () => {
    expect(() => calculateMetersRemaining(10, 11)).toThrow(/exceed/i);
  });
});

describe("normalizeVendorName", () => {
  it("trims and lowercases", () => {
    expect(normalizeVendorName("  Acme   Textiles ")).toBe("acme textiles");
  });
});

describe("calculateDueAtFromCalendarDate", () => {
  it("returns Dubai end of day as a Date", () => {
    const due = calculateDueAtFromCalendarDate("2026-07-28");
    expect(due.toISOString()).toBe("2026-07-28T19:59:59.999Z");
  });
});
