import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildDeliveryNoteWorkbook,
  type DeliveryNoteWorkbookData,
} from "@/modules/documents/infrastructure/delivery-note-workbook";

const sampleData: DeliveryNoteWorkbookData = {
  companyLegalName: "DEEZANO CLOTHING LINE LLC",
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
  it("keeps the real logo and sheet name", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.name).toBe("Delivery Note");
    expect(sheet.getImages()).toHaveLength(1);
  });

  it("fills the company header block", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B3").value).toBe(sampleData.companyLegalName);
    expect(sheet.getCell("B4").value).toBe(`TRN:${sampleData.companyTrn}`);
    expect(sheet.getCell("B5").value).toBe(sampleData.companyPhone);
    expect(sheet.getCell("B6").value).toBe(sampleData.companyWebsite);
    expect(sheet.getCell("B7").value).toBe(sampleData.companyAddressLine1);
    expect(sheet.getCell("B8").value).toBe(sampleData.companyAddressLine2);
  });

  it("fills the boxed header fields", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("E6").value).toBe("DELIVERY NOTE");
    expect(sheet.getCell("F8").value).toEqual(sampleData.noteDate);
    expect(sheet.getCell("F9").value).toBe(sampleData.documentNumber);
    expect(sheet.getCell("F10").value).toEqual(sampleData.dispatchDate);
    expect(sheet.getCell("F11").value).toBe("Job work");
    expect(sheet.getCell("F12").value).toBe(sampleData.lpoReference);
  });

  it("fills the customer block", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B11").value).toBe(`TRN: ${sampleData.clientTrn}`);
    expect(sheet.getCell("B12").value).toBe(sampleData.clientName);
    expect(sheet.getCell("B13").value).toBe(sampleData.clientSubEntityName);
    expect(sheet.getCell("B14").value).toBe(
      "UNIT#REST2, AMERICAN HOSPITAL, BUR DUBAI, OUD METHA",
    );
    expect(sheet.getCell("B15").value).toBe("AE - 8668 Dubai");
  });

  it("writes a single line item at row 18 with totals directly below", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B18").value).toBe(1);
    expect(sheet.getCell("C18").value).toBe(sampleData.lineItems[0]!.description);
    expect(sheet.getCell("D18").value).toBe(2);
    expect(sheet.getCell("E18").value).toBe(75);
    expect(sheet.getCell("F18").value).toBe(150);
    expect(sheet.getCell("F19").value).toBe(150);
    expect(sheet.getCell("F20").value).toBe(7.5);
    expect(sheet.getCell("F21").value).toBe(157.5);
    expect(sheet.getCell("B23").value).toBe(`Notes: ${sampleData.notes}`);
  });

  it("prints the footer below the notes box", async () => {
    const sheet = await readBackWorkbook(sampleData);
    expect(sheet.getCell("B26").value).toBe(
      "DEEZANO CLOTHING LINE LLC , 971502641611 , info@deezanoae.com",
    );
    expect(sheet.getCell("B27").value).toBe(sampleData.companyAddressLine2);
  });

  it("grows for more line items, shifting totals, notes and footer down", async () => {
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
    expect(sheet.getCell("C18").value).toBe(threeLineData.lineItems[0]!.description);
    expect(sheet.getCell("C19").value).toBe("SHIRT");
    expect(sheet.getCell("C20").value).toBe("PANT");
    expect(sheet.getCell("F21").value).toBe(240);
    expect(sheet.getCell("F22").value).toBe(12);
    expect(sheet.getCell("F23").value).toBe(252);
    expect(sheet.getCell("B25").value).toBe(`Notes: ${sampleData.notes}`);
    expect(sheet.getCell("B28").value).toContain("DEEZANO");
  });

  it("leaves the Notes box empty when there are no notes", async () => {
    const sheet = await readBackWorkbook({ ...sampleData, notes: null });
    expect(String(sheet.getCell("B23").value ?? "")).toBe("");
  });
});
