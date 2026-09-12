import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildQuotationWorkbook,
  type QuotationWorkbookData,
} from "@/modules/documents/infrastructure/quotation-workbook";

const sampleData: QuotationWorkbookData = {
  companyLegalName: "DEEZANO CLOTHING LINE LLC",
  companyTrn: "104067685800003",
  companyPhone: "971502641611",
  companyEmail: "info@deezanoae.com",
  companyWebsite: "https://deezanoapparel.com/",
  companyAddressLine1: "Office No. 102-060, Malak premium, DIP 1",
  companyAddressLine2: "DUBAI, UAE",
  documentNumber: "AHO-QTN-23072026-01",
  documentDate: new Date("2026-07-23T00:00:00.000Z"),
  clientTrn: "100584549800003",
  clientSubEntityName: "MOHAMED & OBAID ALMULLA LLC",
  clientName: "THE PLAZA BISTRO RESTURANT & CAFE LLC",
  invoiceAddress: "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA\nAE - 8668 Dubai",
  lineItems: [
    {
      position: 1,
      category: "SHIRT",
      description: "SHIRT MADE IN POLY VISCOSE",
      quantity: 1,
      unitPrice: 95,
      lineTotal: 95,
    },
  ],
  subtotal: 95,
  vatPercent: 5,
  vatAmount: 4.75,
  grandTotal: 99.75,
};

async function readBackWorkbook(data: QuotationWorkbookData) {
  const workbook = await buildQuotationWorkbook(data);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const readBack = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readBack.xlsx.load(buffer as any);
  return readBack.worksheets[0]!;
}

describe("buildQuotationWorkbook", () => {
  it("keeps the real logo and sheet name", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.name).toBe("Quotation");
    expect(sheet.getImages()).toHaveLength(1);
  });

  it("fills company header, document number, and customer block", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B4").value).toBe(`TRN:${sampleData.companyTrn}`);
    expect(sheet.getCell("G9").value).toBe(sampleData.documentNumber);
    expect(sheet.getCell("B11").value).toBe(`TRN: ${sampleData.clientTrn}`);
    expect(sheet.getCell("B12").value).toBe(sampleData.clientName);
    expect(sheet.getCell("B13").value).toBe(sampleData.clientSubEntityName);
    expect(sheet.getCell("B14").value).toBe(
      "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA",
    );
    expect(sheet.getCell("B15").value).toBe("AE - 8668 Dubai");
  });

  it("shrinks the template's two sample rows down to one when there's a single line item", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B18").value).toBe(1);
    expect(sheet.getCell("C18").value).toBe("SHIRT");
    expect(sheet.getCell("D18").value).toBe("SHIRT MADE IN POLY VISCOSE");
    // totals should now sit at row 19, not 20
    expect(sheet.getCell("G19").value).toBe(95);
    expect(sheet.getCell("G20").value).toBe(4.75);
    expect(sheet.getCell("G21").value).toBe(99.75);
    expect(sheet.getCell("C24").value).toContain("DEEZANO");
  });

  it("grows beyond the template's two sample rows for more line items", async () => {
    const fourLineData: QuotationWorkbookData = {
      ...sampleData,
      lineItems: [
        sampleData.lineItems[0]!,
        { position: 2, category: "PANT", description: "Pant made in Poly viscose", quantity: 1, unitPrice: 75, lineTotal: 75 },
        { position: 3, category: "APRON", description: "Short apron", quantity: 2, unitPrice: 60, lineTotal: 120 },
        { position: 4, category: "COAT", description: "Chef coat", quantity: 1, unitPrice: 90, lineTotal: 90 },
      ],
      subtotal: 380,
      vatAmount: 19,
      grandTotal: 399,
    };
    const sheet = await readBackWorkbook(fourLineData);
    expect(sheet.getCell("C18").value).toBe("SHIRT");
    expect(sheet.getCell("C19").value).toBe("PANT");
    expect(sheet.getCell("C20").value).toBe("APRON");
    expect(sheet.getCell("C21").value).toBe("COAT");
    expect(sheet.getCell("G22").value).toBe(380);
    expect(sheet.getCell("G23").value).toBe(19);
    expect(sheet.getCell("G24").value).toBe(399);
  });
});
