import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildDeliveryNoteWorkbook,
  type DeliveryNoteWorkbookData,
} from "@/modules/documents/infrastructure/delivery-note-workbook";

const sampleData: DeliveryNoteWorkbookData = {
  companyTrn: "104067685800003",
  companyPhone: "971502641611",
  companyEmail: "info@deezanoae.com",
  companyWebsite: "https://deezanoapparel.com/",
  companyAddressLine1: "Office No. 102-060, Malak premium, DIP 1",
  companyAddressLine2: "DUBAI, UAE",
  documentNumber: "AHD-DN-23072026-05",
  dispatchDate: new Date("2026-07-18T00:00:00.000Z"),
  noteDate: new Date("2026-07-23T00:00:00.000Z"),
  noteType: "Job work",
  lpoReference: "32610199732776UFYVHU",
  clientTrn: "100584549800003",
  clientSubEntityName: "MOHAMED & OBAID ALMULLA LLC",
  clientName: "THE PLAZA BISTRO RESTURANT & CAFE LLC",
  invoiceAddress: "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA\nAE - 8668 Dubai",
  notes: "3 shirts, 1 pant and 3 waistcoats.",
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

async function readBackWorkbook(data: DeliveryNoteWorkbookData) {
  const workbook = await buildDeliveryNoteWorkbook(data);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const readBack = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readBack.xlsx.load(buffer as any);
  return readBack.worksheets[0]!;
}

describe("buildDeliveryNoteWorkbook", () => {
  it("keeps the real logo (copied in from the invoice template) and sheet name", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.name).toBe("Delivery Note");
    expect(sheet.getImages()).toHaveLength(1);
  });

  it("fills company header and the combined label+value header boxes", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("C11").value).toBe(sampleData.companyAddressLine1);
    expect(sheet.getCell("C13").value).toBe(`TRN: ${sampleData.companyTrn}`);
    expect(sheet.getCell("I8").value).toBe(
      `Delivery Note# -${sampleData.documentNumber}`,
    );
    expect(sheet.getCell("I9").value).toBe(
      `LPO REFERENCE -${sampleData.lpoReference}`,
    );
    expect(sheet.getCell("C18").value).toBe(sampleData.documentNumber);
  });

  it("fills the merged customer block and note type/date fields", async () => {
    const sheet = await readBackWorkbook(sampleData);
    const block = String(sheet.getCell("C21").value);
    expect(block).toContain(sampleData.clientName);
    expect(block).toContain(sampleData.clientSubEntityName);
    expect(block).toContain(sampleData.clientTrn!);
    expect(block).toContain("UNIT#REST2");
    expect(sheet.getCell("K22").value).toBe("Job work");
  });

  it("shrinks the template's two sample rows down to one when there's a single line item", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("C30").value).toBe(1);
    expect(sheet.getCell("D30").value).toBe(sampleData.lineItems[0]!.description);
    // totals shift from 32/33/34 up to 31/32/33
    expect(sheet.getCell("G31").value).toBe(150);
    expect(sheet.getCell("G32").value).toBe(7.5);
    expect(sheet.getCell("G33").value).toBe(157.5);
    expect(sheet.getCell("C35").value).toBe(`Notes: ${sampleData.notes}`);
  });

  it("grows beyond the template's two sample rows for more line items", async () => {
    const threeLineData: DeliveryNoteWorkbookData = {
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
    expect(sheet.getCell("D30").value).toBe(threeLineData.lineItems[0]!.description);
    expect(sheet.getCell("D31").value).toBe("SHIRT");
    expect(sheet.getCell("D32").value).toBe("PANT");
    expect(sheet.getCell("G33").value).toBe(240);
    expect(sheet.getCell("G34").value).toBe(12);
    expect(sheet.getCell("G35").value).toBe(252);
  });
});
