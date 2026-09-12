import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildQuoteWorkbook,
  type QuoteWorkbookData,
} from "@/modules/documents/infrastructure/quote-workbook";

const baseData: QuoteWorkbookData = {
  companyLegalName: "DEEZANO CLOTHING LINE LLC",
  companyTrn: "104067685800003",
  companyPhone: "971502641611",
  companyEmail: "info@deezanoapparel.com",
  companyWebsite: "https://deezanoapparel.com/",
  companyAddressLine1: "Office No. 102-060, Malak premium, DIP 1",
  companyAddressLine2: "DUBAI, UAE",
  documentNumber: "AHD-QUO-23072026-01",
  documentDate: new Date("2026-07-23T00:00:00.000Z"),
  clientTrn: "100584549800003",
  clientSubEntityName: "MOHAMED & OBAID ALMULLA LLC",
  clientName: "THE PLAZA BISTRO RESTURANT & CAFE LLC",
  invoiceAddress: "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA\nAE - 8668 Dubai",
  lineItems: [
    {
      category: "JACKET",
      description: "Single-breasted jacket",
      quantity: 1,
      originalUnitPrice: 275,
      discountPercent: 5,
      revisedUnitPrice: 261.25,
      revisedTotalPrice: 261.25,
    },
    {
      category: "TROUSERS",
      description: "Straight-cut trousers",
      quantity: 1,
      originalUnitPrice: 75,
      discountPercent: 5,
      revisedUnitPrice: 71.25,
      revisedTotalPrice: 71.25,
    },
    {
      category: "SHIRT",
      description: "Button-up shirt",
      quantity: 1,
      originalUnitPrice: 80,
      discountPercent: 5,
      revisedUnitPrice: 76,
      revisedTotalPrice: 76,
    },
  ],
  subtotal: 408.5,
  vatPercent: 5,
  vatAmount: 20.43,
  grandTotal: 428.93,
};

function richTextOf(value: unknown): string {
  if (value && typeof value === "object" && "richText" in value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value as any).richText.map((run: { text: string }) => run.text).join("");
  }
  return String(value);
}

async function readBackWorkbook(data: QuoteWorkbookData) {
  const workbook = await buildQuoteWorkbook(data);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const readBack = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readBack.xlsx.load(buffer as any);
  return readBack.worksheets[0]!;
}

describe("buildQuoteWorkbook", () => {
  it("keeps the real logo, sheet name, and static Terms & Conditions block", async () => {
    const sheet = await readBackWorkbook(baseData);
    expect(sheet.name).toBe("Quote");
    expect(sheet.getImages()).toHaveLength(1);
    // baseData has 3 line items, shrinking the template's 7 sample rows by 4,
    // so the T&Cs block (originally starting row 29) has already shifted to 25.
    expect(richTextOf(sheet.getCell("C26").value)).toContain("Approved Sample");
  });

  it("fills company header, document number, and customer block", async () => {
    const sheet = await readBackWorkbook(baseData);
    expect(sheet.getCell("B4").value).toBe(`TRN:${baseData.companyTrn}`);
    expect(sheet.getCell("G5").value).toBe(baseData.documentNumber);
    expect(sheet.getCell("B11").value).toBe(`TRN: ${baseData.clientTrn}`);
    expect(sheet.getCell("B12").value).toBe(baseData.clientName);
    expect(sheet.getCell("B14").value).toBe(baseData.invoiceAddress);
  });

  it("shrinks the template's seven sample rows down to three line items, totals and T&Cs shifting with them", async () => {
    const sheet = await readBackWorkbook(baseData);
    expect(sheet.getCell("C18").value).toBe("Single-breasted jacket");
    expect(sheet.getCell("F18").value).toBeCloseTo(0.05);
    expect(sheet.getCell("G18").value).toBe(261.25);
    expect(sheet.getCell("H18").value).toBe(261.25);
    expect(sheet.getCell("C19").value).toBe("Straight-cut trousers");
    expect(sheet.getCell("C20").value).toBe("Button-up shirt");
    // totals shift from 25/26/27 up to 21/22/23 (3 items instead of 7)
    expect(sheet.getCell("H21").value).toBe(408.5);
    expect(sheet.getCell("H22").value).toBe(20.43);
    expect(sheet.getCell("H23").value).toBe(428.93);
    // Terms & Conditions block (originally starting row 29) shifts up by 4 too
    expect(richTextOf(sheet.getCell("C26").value)).toContain("Approved Sample");
    // footer (originally 48/49) shifts up by 4 -> 44/45
    expect(sheet.getCell("C44").value).toContain("DEEZANO");
    expect(sheet.getCell("C45").value).toBe(baseData.companyAddressLine2);
  });

  it("replaces the static Terms & Conditions block when custom terms are supplied", async () => {
    const customTermsData: QuoteWorkbookData = {
      ...baseData,
      termsAndConditions: [
        "Payment: 50% deposit, balance on delivery.",
        "Lead time: 3 weeks from PO confirmation.",
        "No colon here so it stays plain",
      ],
    };
    const sheet = await readBackWorkbook(customTermsData);
    // T&Cs points start at subtotalRow(21) + 5 = 26.
    expect(sheet.getCell("B26").value).toBe(1);
    expect(richTextOf(sheet.getCell("C26").value)).toBe(
      "Payment: 50% deposit, balance on delivery.",
    );
    expect(sheet.getCell("B27").value).toBe(2);
    expect(sheet.getCell("B28").value).toBe(3);
    // A term without a colon is written as plain text, not rich text.
    expect(sheet.getCell("C28").value).toBe("No colon here so it stays plain");
    // 3 term rows instead of 16 -> footer moves up to 26 + 3 + 2 = 31/32.
    expect(sheet.getCell("C31").value).toContain("DEEZANO");
    expect(sheet.getCell("C32").value).toBe(customTermsData.companyAddressLine2);
  });

  it("keeps the template's static Terms & Conditions when none are supplied", async () => {
    const sheet = await readBackWorkbook({ ...baseData, termsAndConditions: null });
    expect(richTextOf(sheet.getCell("C26").value)).toContain("Approved Sample");
    expect(sheet.getCell("C44").value).toContain("DEEZANO");
  });
});
