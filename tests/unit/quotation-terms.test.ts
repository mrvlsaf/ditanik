import { describe, expect, it } from "vitest";

import {
  applyPaymentTerms,
  calculateQuotationValidityDate,
  parseTermsText,
  QUOTATION_VALIDITY_DAYS,
} from "@/modules/documents/domain/quotation-terms";

describe("parseTermsText", () => {
  it("returns null for empty / blank / missing text so no terms are printed", () => {
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

  it("removes a pasted heading, clause numbers, number-only lines and wrapping quotes", () => {
    const pasted = [
      "TERMS AND CONDITIONS",
      "1",
      "1 Approved Sample: All uniforms follow the sample.",
      '2 "Order Confirmation: An order is confirmed on PO release. "',
      "3. Fabric: As discussed.",
      "4)\tQuantity:\tBased on the PO.",
    ].join("\n");
    expect(parseTermsText(pasted)).toEqual([
      "Approved Sample: All uniforms follow the sample.",
      "Order Confirmation: An order is confirmed on PO release.",
      "Fabric: As discussed.",
      "Quantity: Based on the PO.",
    ]);
  });

  it("joins a quoted clause that was pasted over several lines", () => {
    expect(
      parseTermsText(
        '2 "Order Confirmation: An order is confirmed\non PO release."\nFabric: As discussed.',
      ),
    ).toEqual([
      "Order Confirmation: An order is confirmed on PO release.",
      "Fabric: As discussed.",
    ]);
  });

  it("keeps clauses that merely start with a figure", () => {
    expect(parseTermsText("5% UAE VAT applies.")).toEqual(["5% UAE VAT applies."]);
  });
});

describe("applyPaymentTerms", () => {
  const terms = [
    "Delivery: Two weeks.",
    "Payment Terms: Payment terms are 30 days credit ( full payment 30 days after invoice submission )",
    "Outstanding Payments: We may hold orders.",
  ];

  it("replaces the payment value with the typed text, in bold", () => {
    expect(applyPaymentTerms(terms, "50% advance, 50% on delivery")).toEqual([
      terms[0],
      "Payment Terms: Payment terms are **50% advance, 50% on delivery**",
      terms[2],
    ]);
  });

  it("keeps the company wording, in bold, when nothing is typed", () => {
    expect(applyPaymentTerms(terms, "  ")?.[1]).toBe(
      "Payment Terms: Payment terms are **30 days credit ( full payment 30 days after invoice submission )**",
    );
    expect(applyPaymentTerms(["Payment Terms: 100% upfront."], undefined)).toEqual([
      "Payment Terms: **100% upfront.**",
    ]);
  });

  it("ignores markup and line breaks in the typed text", () => {
    expect(applyPaymentTerms(terms, "**30**\ndays")?.[1]).toBe(
      "Payment Terms: Payment terms are **30 days**",
    );
  });

  it("adds a payment clause before 'Outstanding Payments' when the terms have none", () => {
    const withoutPayment = [terms[0]!, terms[2]!];
    expect(applyPaymentTerms(withoutPayment, "net 30")).toEqual([
      terms[0],
      "Payment Terms: Payment terms are **net 30**",
      terms[2],
    ]);
  });

  it("prints nothing when the company has no terms", () => {
    expect(applyPaymentTerms(null, "net 30")).toBeNull();
    expect(applyPaymentTerms([], "net 30")).toBeNull();
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
