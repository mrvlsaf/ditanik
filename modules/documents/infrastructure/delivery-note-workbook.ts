import ExcelJS from "exceljs";

import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the Delivery Note template — extracted from the client's own
 * workbook (DELIVERY NOTE AMERICAN.xlsx, "khin" tab; the embedded Deezano
 * logo was missing from every per-order tab in that source file, so it was
 * copied in from the same byte-identical logo used on the other three
 * templates).
 */

const TEMPLATE_ROW = 30; // the template's two sample line-item rows (30-31).
const TEMPLATE_ROW_COUNT = 2;

export type DeliveryNoteLineItemRow = {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type DeliveryNoteWorkbookData = {
  companyTrn: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  documentNumber: string;
  dispatchDate: Date;
  noteDate: Date;
  /** Fixed constant on every real example seen; kept overridable for future flexibility. */
  noteType: string;
  lpoReference: string;
  clientTrn: string | null;
  clientSubEntityName: string | null;
  clientName: string;
  invoiceAddress: string;
  notes: string | null;
  lineItems: DeliveryNoteLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
};

export async function buildDeliveryNoteWorkbook(
  data: DeliveryNoteWorkbookData,
): Promise<ExcelJS.Workbook> {
  const { workbook, sheet } = await loadTemplateWorkbook("delivery-note.xlsx");

  sheet.getCell("C11").value = data.companyAddressLine1 ?? "";
  sheet.getCell("C12").value = data.companyAddressLine2 ?? "";
  sheet.getCell("C13").value = data.companyTrn ? `TRN: ${data.companyTrn}` : "";
  sheet.getCell("C14").value = data.companyWebsite ?? "";
  sheet.getCell("C15").value = data.companyPhone ?? "";

  // The top-right highlighted box embeds label + value as one string, unlike
  // every other field on this template — matches the real file exactly.
  sheet.getCell("I8").value = `Delivery Note# -${data.documentNumber}`;
  sheet.getCell("I9").value = `LPO REFERENCE -${data.lpoReference}`;

  sheet.getCell("C18").value = data.documentNumber;
  sheet.getCell("L18").value = data.dispatchDate;
  sheet.getCell("K20").value = data.noteDate;
  sheet.getCell("K22").value = data.noteType;

  const customerBlock = [
    data.clientName,
    data.clientSubEntityName,
    data.clientTrn ? `TRN: ${data.clientTrn}` : null,
    data.invoiceAddress,
  ]
    .filter(Boolean)
    .join("\n");
  sheet.getCell("C21").value = customerBlock;

  const itemCount = Math.max(data.lineItems.length, 1);
  setLineItemRowCount(sheet, TEMPLATE_ROW, TEMPLATE_ROW_COUNT, itemCount);

  data.lineItems.forEach((line, index) => {
    const row = TEMPLATE_ROW + index;
    sheet.getCell(`C${row}`).value = line.position;
    sheet.getCell(`D${row}`).value = line.description;
    sheet.getCell(`E${row}`).value = line.quantity;
    sheet.getCell(`F${row}`).value = line.unitPrice;
    sheet.getCell(`G${row}`).value = line.lineTotal;
  });

  const subtotalRow = TEMPLATE_ROW + itemCount;
  sheet.getCell(`G${subtotalRow}`).value = data.subtotal;
  sheet.getCell(`G${subtotalRow + 1}`).value = data.vatAmount;
  sheet.getCell(`G${subtotalRow + 2}`).value = data.grandTotal;

  const notesRow = subtotalRow + 4; // matches the template's fixed gap after totals
  sheet.getCell(`C${notesRow}`).value = data.notes ? `Notes: ${data.notes}` : "";

  return workbook;
}
