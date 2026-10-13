import { describe, expect, it } from "vitest";

import {
  calculateQuotationValidityDate,
  DEFAULT_QUOTATION_TERMS,
  parseTermsText,
  QUOTATION_VALIDITY_DAYS,
} from "@/modules/documents/domain/quotation-terms";

describe("parseTermsText", () => {
  it("returns null for empty / blank / missing text so the standard clauses are used", () => {
    expect(parseTermsText(null)).toBeNull();
    expect(parseTermsText(undefined)).toBeNull();
    expect(parseTermsText("")).toBeNull();
    expect(parseTermsText("  \n \r\n  ")).toBeNull();
  });

  it("splits on lines, trims, and drops blank lines", () => {
    expect(parseTermsText("Payment: 50% advance.\n\n  Delivery: 2 weeks.  \r\n")).toEqual(
      ["Payment: 50% advance.", "Delivery: 2 weeks."],
    );
  });
});

describe("DEFAULT_QUOTATION_TERMS", () => {
  it("has the 16 standard clauses, each with a bold-able 'Label:' prefix", () => {
    expect(DEFAULT_QUOTATION_TERMS).toHaveLength(16);
    for (const clause of DEFAULT_QUOTATION_TERMS) {
      expect(clause).toMatch(/^[A-Za-z &]+:/);
    }
  });

  it("uses the approved payment terms", () => {
    expect(DEFAULT_QUOTATION_TERMS[7]).toContain("50% ADVANCE . 50% UPON DELIVERY.");
  });
});

describe("calculateQuotationValidityDate", () => {
  it("adds 30 days to the document date", () => {
    expect(QUOTATION_VALIDITY_DAYS).toBe(30);
    expect(calculateQuotationValidityDate(new Date("2026-09-21T00:00:00.000Z"))).toEqual(
      new Date("2026-10-21T00:00:00.000Z"),
    );
  });

  it("crosses month and year boundaries and does not mutate its input", () => {
    const input = new Date("2026-12-15T10:00:00.000Z");
    expect(calculateQuotationValidityDate(input)).toEqual(
      new Date("2027-01-14T10:00:00.000Z"),
    );
    expect(input).toEqual(new Date("2026-12-15T10:00:00.000Z"));
  });
});
