import ExcelJS from "exceljs";

import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the Delivery Note template. It shares the approved Quotation look (new
 * logo, company block, boxed header fields, CUSTOMER bar, yellow totals,
 * footer) but keeps the delivery note's own fields: Delivery Note #, dispatch
 * date, note date/type, LPO reference and a free-text Notes box.
 */

const TEMPLATE_ROW = 18; // the template's single sample line-item row.
const TEMPLATE_ROW_COUNT = 1;

export type DeliveryNoteLineItemRow = {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type DeliveryNoteWorkbookData = {
  companyLegalName: string;
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

  sheet.getCell("B3").value = data.companyLegalName;
  sheet.getCell("B4").value = data.companyTrn ? `TRN:${data.companyTrn}` : "";
  sheet.getCell("B5").value = data.companyPhone ?? "";
  sheet.getCell("B6").value = data.companyWebsite ?? "";
  sheet.getCell("B7").value = data.companyAddressLine1 ?? "";
  sheet.getCell("B8").value = data.companyAddressLine2 ?? "";

  sheet.getCell("F8").value = data.noteDate;
  sheet.getCell("F9").value = data.documentNumber;
  sheet.getCell("F10").value = data.dispatchDate;
  sheet.getCell("F11").value = data.noteType;
  sheet.getCell("F12").value = data.lpoReference;

  sheet.getCell("B11").value = data.clientTrn ? `TRN: ${data.clientTrn}` : "";
  sheet.getCell("B12").value = data.clientName;
  sheet.getCell("B13").value = data.clientSubEntityName ?? "";
  const [addressLine1 = "", ...addressRest] = data.invoiceAddress.split(/\r?\n/);
  sheet.getCell("B14").value = addressLine1;
  sheet.getCell("B15").value = addressRest.join(", ");

  const itemCount = Math.max(data.lineItems.length, 1);
  setLineItemRowCount(sheet, TEMPLATE_ROW, TEMPLATE_ROW_COUNT, itemCount);

  data.lineItems.forEach((line, index) => {
    const row = TEMPLATE_ROW + index;
    sheet.getCell(`B${row}`).value = line.position;
    sheet.getCell(`C${row}`).value = line.description;
    sheet.getCell(`D${row}`).value = line.quantity;
    sheet.getCell(`E${row}`).value = line.unitPrice;
    sheet.getCell(`F${row}`).value = line.lineTotal;
  });

  const subtotalRow = TEMPLATE_ROW + itemCount;
  sheet.getCell(`F${subtotalRow}`).value = data.subtotal;
  sheet.getCell(`F${subtotalRow + 1}`).value = data.vatAmount;
  sheet.getCell(`F${subtotalRow + 2}`).value = data.grandTotal;

  const notesRow = subtotalRow + 4; // matches the template's fixed gap after totals
  sheet.getCell(`B${notesRow}`).value = data.notes ? `Notes: ${data.notes}` : "";

  const footerRow1 = subtotalRow + 7; // below the Notes box
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`B${footerRow1}`).value = footerLine1;
  sheet.getCell(`B${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
