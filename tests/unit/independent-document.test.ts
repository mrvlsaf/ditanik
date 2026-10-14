import { describe, expect, it } from "vitest";

import { formatDocumentNumber } from "@/modules/documents/domain/document-numbering";
import {
  documentTypeLabel,
  independentDocumentSchema,
  siteCodeFromDocumentNumber,
  toIndependentLineRows,
} from "@/modules/documents/domain/independent-document";

const validValues = {
  type: "TAX_INVOICE",
  siteCode: "AHO",
  clientName: "ABC Hotel",
  address: "PO Box 1\nDubai",
  lineItems: [{ description: "Uniform", quantity: 2, unitPrice: 10 }],
};

describe("independentDocumentSchema", () => {
  it("accepts a minimal valid document and trims text", () => {
    const parsed = independentDocumentSchema.parse({
      ...validValues,
      clientName: "  ABC Hotel  ",
    });
    expect(parsed.clientName).toBe("ABC Hotel");
    expect(parsed.clientTrn).toBeUndefined();
  });

  it("rejects an unknown document type", () => {
    expect(
      independentDocumentSchema.safeParse({ ...validValues, type: "QUOTE" }).success,
    ).toBe(false);
  });

  it("requires site code, client name, address and at least one line", () => {
    for (const patch of [
      { siteCode: "" },
      { clientName: " " },
      { address: "" },
      { lineItems: [] },
    ]) {
      expect(
        independentDocumentSchema.safeParse({ ...validValues, ...patch }).success,
      ).toBe(false);
    }
  });

  it("restricts site code characters so it is safe in file names", () => {
    expect(
      independentDocumentSchema.safeParse({ ...validValues, siteCode: "A/B" }).success,
    ).toBe(false);
    expect(
      independentDocumentSchema.safeParse({ ...validValues, siteCode: "AHO-2" }).success,
    ).toBe(true);
  });

  it("validates line quantities, prices and discounts", () => {
    const bad = (line: object) =>
      independentDocumentSchema.safeParse({
        ...validValues,
        lineItems: [{ description: "x", quantity: 1, unitPrice: 1, ...line }],
      }).success;
    expect(bad({ quantity: 0 })).toBe(false);
    expect(bad({ quantity: 1.5 })).toBe(false);
    expect(bad({ unitPrice: -1 })).toBe(false);
    expect(bad({ discountPercent: 101 })).toBe(false);
    expect(bad({ discountPercent: 10 })).toBe(true);
  });
});

describe("toIndependentLineRows", () => {
  it("numbers lines from 1 and prints the discounted unit price", () => {
    const rows = toIndependentLineRows([
      { description: "A", quantity: 2, unitPrice: 100, discountPercent: 10 },
      { description: "B", category: " Shirts ", quantity: 1, unitPrice: 5 },
    ]);
    expect(rows).toEqual([
      {
        position: 1,
        category: null,
        description: "A",
        quantity: 2,
        unitPrice: 90,
        lineTotal: 180,
      },
      {
        position: 2,
        category: "Shirts",
        description: "B",
        quantity: 1,
        unitPrice: 5,
        lineTotal: 5,
      },
    ]);
  });
});

describe("siteCodeFromDocumentNumber", () => {
  it("round-trips numbers produced by formatDocumentNumber, hyphens included", () => {
    for (const siteCode of ["AHO", "AHO-2"]) {
      const number = formatDocumentNumber({
        siteCode,
        type: "TAX_INVOICE",
        generatedAt: new Date("2026-07-23T08:00:00Z"),
        sequence: 9,
      });
      expect(siteCodeFromDocumentNumber(number)).toBe(siteCode);
    }
  });

  it("returns null for strings that are not document numbers", () => {
    expect(siteCodeFromDocumentNumber("hello")).toBeNull();
  });
});

describe("documentTypeLabel", () => {
  it("uses friendly names", () => {
    expect(documentTypeLabel("QUOTATION")).toBe("Quotation");
    expect(documentTypeLabel("TAX_INVOICE")).toBe("Tax Invoice");
    expect(documentTypeLabel("DELIVERY_NOTE")).toBe("Delivery Note");
  });
});
