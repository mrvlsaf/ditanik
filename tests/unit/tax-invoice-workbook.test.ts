import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildInvoiceWorkbook,
  type InvoiceWorkbookData,
} from "@/modules/documents/infrastructure/tax-invoice-workbook";

const sampleData: InvoiceWorkbookData = {
  companyLegalName: "DEEZANO CLOTHING LINE LLC",
  companyTrn: "104067685800003",
  companyPhone: "971502641611",
  companyEmail: "info@deezanoae.com",
  companyWebsite: "https://deezanoapparel.com/",
  companyAddressLine1: "Office No. 102-060, Malak premium, DIP 1",
  companyAddressLine2: "DUBAI, UAE",
  documentNumber: "AHO-INV-23072026-09",
  documentDate: new Date("2026-07-23T00:00:00.000Z"),
  lpoReference: "32610199732776UFYVHU",
  clientTrn: "100584549800003",
  clientSubEntityName: "MOHAMED & OBAID ALMULLA LLC",
  clientName: "THE PLAZA BISTRO RESTURANT & CAFE LLC",
  invoiceAddress: "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA\nAE - 8668 Dubai",
  lineItems: [
    {
      position: 1,
      description: "TROUSERS - Trousers made in polyviscose fabric",
      quantity: 2,
      unitPrice: 75,
      lineTotal: 150,
    },
  ],
  subtotal: 150,
  vatPercent: 5,
  vatAmount: 7.5,
  grandTotal: 157.5,
};

async function readBackWorkbook(data: InvoiceWorkbookData) {
  const workbook = await buildInvoiceWorkbook(data);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const readBack = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readBack.xlsx.load(buffer as any);
  return readBack.worksheets[0]!;
}

describe("buildInvoiceWorkbook", () => {
  it("produces a workbook that survives a write/read round trip and keeps the real logo", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.name).toBe("Tax Invoice");
    expect(sheet.getImages()).toHaveLength(1);
  });

  it("fills the company header block", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B4").value).toBe(`TRN:${sampleData.companyTrn}`);
    expect(sheet.getCell("B7").value).toBe(sampleData.companyAddressLine1);
    expect(sheet.getCell("B8").value).toBe(sampleData.companyAddressLine2);
  });

  it("fills the document number box", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("F9").value).toBe(sampleData.documentNumber);
    expect(sheet.getCell("F10").value).toBe(sampleData.lpoReference);
  });

  it("fills the customer block from the LPO's client details", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("C11").value).toBe(`TRN: ${sampleData.clientTrn}`);
    expect(sheet.getCell("C12").value).toBe(sampleData.clientName);
    expect(sheet.getCell("C13").value).toBe(sampleData.clientSubEntityName);
    expect(sheet.getCell("C14").value).toBe(sampleData.invoiceAddress);
  });

  it("writes one row per line item starting at row 18", async () => {
    const sheet = await readBackWorkbook(sampleData);
    const row = sheet.getRow(18);
    expect(row.getCell(2).value).toBe(1);
    expect(row.getCell(3).value).toBe(sampleData.lineItems[0]!.description);
    expect(row.getCell(4).value).toBe(2);
    expect(row.getCell(5).value).toBe(75);
    expect(row.getCell(6).value).toBe(150);
  });

  it("writes subtotal, VAT and grand total rows after the line items", async () => {
    const sheet = await readBackWorkbook(sampleData);
    // one line item (row 18) -> totals start at row 19
    expect(sheet.getCell("F19").value).toBe(150);
    expect(sheet.getCell("F20").value).toBe(7.5);
    expect(sheet.getCell("F21").value).toBe(157.5);
  });

  it("prints the footer below the totals", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("C24").value).toBe(
      "DEEZANO CLOTHING LINE LLC , 971502641611 , info@deezanoae.com",
    );
    expect(sheet.getCell("C25").value).toBe(sampleData.companyAddressLine2);
  });

  it("handles multiple line items by shifting totals and footer down, merges included", async () => {
    const threeLineData: InvoiceWorkbookData = {
      ...sampleData,
      lineItems: [
        sampleData.lineItems[0]!,
        { position: 2, description: "SHIRT", quantity: 1, unitPrice: 50, lineTotal: 50 },
        { position: 3, description: "PANT", quantity: 1, unitPrice: 40, lineTotal: 40 },
      ],
      subtotal: 240,
      vatAmount: 12,
      grandTotal: 252,
    };
    const sheet = await readBackWorkbook(threeLineData);
    expect(sheet.getCell("C19").value).toBe("SHIRT");
    expect(sheet.getCell("C20").value).toBe("PANT");
    expect(sheet.getCell("F21").value).toBe(240);
    expect(sheet.getCell("F22").value).toBe(12);
    expect(sheet.getCell("F23").value).toBe(252);
    expect(sheet.getCell("C26").value).toContain("DEEZANO");
    expect(sheet.getCell("C27").value).toBe(sampleData.companyAddressLine2);
  });
});
