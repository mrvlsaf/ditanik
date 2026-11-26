import { describe, expect, it } from "vitest";

import {
  isSameBusinessDay,
  quotationEditInitialFromSnapshot,
} from "@/modules/documents/domain/quotation-edit";

describe("isSameBusinessDay", () => {
  it("is true for two times on the same Dubai day", () => {
    expect(
      isSameBusinessDay(
        new Date("2026-11-26T01:00:00+04:00"),
        new Date("2026-11-26T23:30:00+04:00"),
      ),
    ).toBe(true);
  });

  it("uses Dubai time, not UTC, for the day boundary", () => {
    // 21:00 UTC on the 25th is 01:00 on the 26th in Dubai.
    expect(
      isSameBusinessDay(
        new Date("2026-11-25T21:00:00Z"),
        new Date("2026-11-26T10:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isSameBusinessDay(
        new Date("2026-11-25T19:00:00Z"),
        new Date("2026-11-25T21:00:00Z"),
      ),
    ).toBe(false);
  });

  it("is false on a later day", () => {
    expect(
      isSameBusinessDay(
        new Date("2026-11-26T10:00:00+04:00"),
        new Date("2026-11-27T10:00:00+04:00"),
      ),
    ).toBe(false);
  });
});

describe("quotationEditInitialFromSnapshot", () => {
  it("reads the saved quotation back into form values", () => {
    const initial = quotationEditInitialFromSnapshot(
      {
        client: {
          clientName: "Acme",
          clientSubEntityName: "Acme Marine",
          clientTrn: "1001",
          address: "Line 1\nLine 2",
          siteCode: "GEMINI",
        },
        paymentTerms: "50% advance",
        lineItems: [
          { category: "Fabric", description: "Cotton", quantity: 10, unitPrice: 12.5 },
        ],
      },
      "GEMINI-QTN-26112026-01",
    );

    expect(initial).toMatchObject({
      siteCode: "GEMINI",
      clientName: "Acme",
      clientSubEntityName: "Acme Marine",
      clientTrn: "1001",
      address: "Line 1\nLine 2",
      paymentTerms: "50% advance",
    });
    expect(initial.lines).toEqual([
      {
        category: "Fabric",
        description: "Cotton",
        articleNo: "",
        quantity: "10",
        unitPrice: "12.5",
        discountPercent: "",
      },
    ]);
  });

  it("falls back to the document number for the site code and survives a bad snapshot", () => {
    const initial = quotationEditInitialFromSnapshot(null, "GEMINI-QTN-26112026-01");
    expect(initial.siteCode).toBe("GEMINI");
    expect(initial.lines).toEqual([]);
    expect(initial.paymentTerms).toBe("");
  });
});
