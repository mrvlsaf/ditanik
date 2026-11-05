import ExcelJS from "exceljs";

import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the Tax Invoice template — extracted from the client's own workbook
 * (INVOICES COPY AMERICAN N CANVAS.xlsx, "baser" tab) via ExcelJS's
 * removeWorksheet API, instead of building the layout from scratch in code.
 */

const TEMPLATE_ROW = 18; // the template's single sample line-item row.
const TEMPLATE_ROW_COUNT = 1;

export type InvoiceLineItemRow = {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceWorkbookData = {
  companyTrn: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyLegalName: string;
  documentNumber: string;
  documentDate: Date;
  lpoReference: string;
  clientTrn: string | null;
  clientSubEntityName: string | null;
  clientName: string;
  invoiceAddress: string;
  lineItems: InvoiceLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
};

export async function buildInvoiceWorkbook(
  data: InvoiceWorkbookData,
): Promise<ExcelJS.Workbook> {
  const { workbook, sheet } = await loadTemplateWorkbook("tax-invoice.xlsx");

  sheet.getCell("B4").value = data.companyTrn ? `TRN:${data.companyTrn}` : "";
  sheet.getCell("B5").value = data.companyPhone ?? "";
  sheet.getCell("B6").value = data.companyWebsite ?? "";
  sheet.getCell("B7").value = data.companyAddressLine1 ?? "";
  sheet.getCell("B8").value = data.companyAddressLine2 ?? "";

  sheet.getCell("F8").value = data.documentDate;
  sheet.getCell("F9").value = data.documentNumber;
  sheet.getCell("F10").value = data.lpoReference;

  sheet.getCell("C11").value = data.clientTrn ? `TRN: ${data.clientTrn}` : "";
  sheet.getCell("C12").value = data.clientName;
  sheet.getCell("C13").value = data.clientSubEntityName ?? "";
  sheet.getCell("C14").value = data.invoiceAddress;

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

  const footerRow1 = subtotalRow + 5; // matches the template's fixed gap after totals
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`C${footerRow1}`).value = footerLine1;
  sheet.getCell(`C${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
