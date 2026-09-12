import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildInvoiceWorkbook,
  type InvoiceWorkbookData,
} from "@/modules/documents/infrastructure/invoice-workbook";

const sampleData: InvoiceWorkbookData = {
  companyLegalName: "DEEZANO",
  companyTrn: "104067685800003",
  companyPhone: "971502641611",
  companyEmail: "info@deezanoae.com",
  companyWebsite: "https://deezanoapparel.com/",
  companyAddressLine1: "Office No. 102-060, Malak premium, DIP 1",
  companyAddressLine2: "DUBAI, UAE",
  documentNumber: "AHO-INV-23072026-09",
  documentDateLabel: "23/07/2026",
  lpoReference: "32610199732776UFYVHU",
  clientTrn: "100584549800003",
  clientSubEntityName: "THE PLAZA BISTRO RESTURANT & CAFE LLC",
  clientName: "MOHAMED & OBAID ALMULLA LLC",
  invoiceAddress: "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA\nAE - 8668 Dubai",
  currency: "AED",
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
  preparedByLabel: null,
};

async function readBackWorkbook(data: InvoiceWorkbookData) {
  const workbook = await buildInvoiceWorkbook(data);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const readBack = new ExcelJS.Workbook();
  // Two @types/node versions in the dependency tree (exceljs pulls an older
  // one transitively) make TS see two nominally distinct `Buffer` types here,
  // even though they're identical at runtime — hence the cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readBack.xlsx.load(buffer as any);
  return readBack.getWorksheet("Tax Invoice")!;
}

describe("buildInvoiceWorkbook", () => {
  it("produces a workbook that survives a write/read round trip", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet).toBeDefined();
  });

  it("fills the company header block", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("A1").value).toBe("DEEZANO");
    expect(sheet.getCell("A2").value).toBe(sampleData.companyLegalName);
    expect(sheet.getCell("A3").value).toBe(`TRN: ${sampleData.companyTrn}`);
  });

  it("fills the document number box", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("D2").value).toBe("TAX INVOICE");
    expect(sheet.getCell("E4").value).toBe(sampleData.documentDateLabel);
    expect(sheet.getCell("E5").value).toBe(sampleData.documentNumber);
    expect(sheet.getCell("E6").value).toBe(sampleData.lpoReference);
  });

  it("fills the customer block from the LPO's client details", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("A10").value).toBe(`TRN: ${sampleData.clientTrn}`);
    expect(sheet.getCell("A11").value).toBe(sampleData.clientSubEntityName);
    expect(sheet.getCell("A12").value).toBe(sampleData.clientName);
    expect(sheet.getCell("A13").value).toBe(
      "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA",
    );
    expect(sheet.getCell("A14").value).toBe("AE - 8668 Dubai");
  });

  it("writes one row per line item starting at row 17", async () => {
    const sheet = await readBackWorkbook(sampleData);
    const row = sheet.getRow(17);
    expect(row.getCell(1).value).toBe(1);
    expect(row.getCell(2).value).toBe(sampleData.lineItems[0]!.description);
    expect(row.getCell(3).value).toBe(2);
    expect(row.getCell(4).value).toBe(75);
    expect(row.getCell(5).value).toBe(150);
  });

  it("writes subtotal, VAT and grand total rows after the line items", async () => {
    const sheet = await readBackWorkbook(sampleData);
    // header (16) + 1 line item (17) -> totals start at row 18
    expect(sheet.getCell("E18").value).toBe(150);
    expect(sheet.getCell("A19").value).toBe("VAT 5%");
    expect(sheet.getCell("E19").value).toBe(7.5);
    expect(sheet.getCell("A20").value).toBe("GRAND TOTAL");
    expect(sheet.getCell("E20").value).toBe(157.5);
  });

  it("handles multiple line items by shifting the totals rows down", async () => {
    const twoLineData: InvoiceWorkbookData = {
      ...sampleData,
      lineItems: [
        sampleData.lineItems[0]!,
        {
          position: 2,
          description: "SHIRT",
          quantity: 1,
          unitPrice: 50,
          lineTotal: 50,
        },
      ],
    };
    const sheet = await readBackWorkbook(twoLineData);
    expect(sheet.getRow(18).getCell(2).value).toBe("SHIRT");
    expect(sheet.getCell("A21").value).toBe("GRAND TOTAL");
  });

  it("prints the footer below the totals", async () => {
    const sheet = await readBackWorkbook(sampleData);
    // totals end at row 20, two blank rows, footer at 23-24
    expect(sheet.getCell("A23").value).toBe("DEEZANO , 971502641611 , info@deezanoae.com");
    expect(sheet.getCell("A24").value).toBe(sampleData.companyAddressLine2);
  });

  it("omits the prepared-by line when none is given", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("A26").value).toBeNull();
  });

  it("includes a prepared-by line when given", async () => {
    const sheet = await readBackWorkbook({
      ...sampleData,
      preparedByLabel: "Basher",
    });
    expect(sheet.getCell("A26").value).toBe("Prepared by: Basher");
  });
});
