import ExcelJS from "exceljs";

import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the real Quotation template — extracted from the client's own
 * workbook (INVOICES COPY AMERICAN N CANVAS.xlsx, "QTN" tab), see
 * docs/DOCUMENT-GENERATION-PLAN.md §8.
 */

const TEMPLATE_ROW = 18; // the template's two sample line-item rows (18-19).
const TEMPLATE_ROW_COUNT = 2;

export type QuotationLineItemRow = {
  position: number;
  category: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuotationWorkbookData = {
  companyLegalName: string;
  companyTrn: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  documentNumber: string;
  documentDate: Date;
  clientTrn: string | null;
  clientSubEntityName: string | null;
  clientName: string;
  invoiceAddress: string;
  lineItems: QuotationLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
};

export async function buildQuotationWorkbook(
  data: QuotationWorkbookData,
): Promise<ExcelJS.Workbook> {
  const { workbook, sheet } = await loadTemplateWorkbook("quotation.xlsx");

  sheet.getCell("B4").value = data.companyTrn ? `TRN:${data.companyTrn}` : "";
  sheet.getCell("B5").value = data.companyPhone ?? "";
  sheet.getCell("B6").value = data.companyWebsite ?? "";
  sheet.getCell("B7").value = data.companyAddressLine1 ?? "";
  sheet.getCell("B8").value = data.companyAddressLine2 ?? "";

  sheet.getCell("G8").value = data.documentDate;
  sheet.getCell("G9").value = data.documentNumber;

  sheet.getCell("B11").value = data.clientTrn ? `TRN: ${data.clientTrn}` : "";
  sheet.getCell("B12").value = data.clientName;
  sheet.getCell("B13").value = data.clientSubEntityName ?? "";
  const [addressLine1, ...addressRest] = data.invoiceAddress.split(/\r?\n/);
  sheet.getCell("B14").value = addressLine1 ?? "";
  sheet.getCell("B15").value = addressRest.join(", ");

  const itemCount = Math.max(data.lineItems.length, 1);
  setLineItemRowCount(sheet, TEMPLATE_ROW, TEMPLATE_ROW_COUNT, itemCount);

  data.lineItems.forEach((line, index) => {
    const row = TEMPLATE_ROW + index;
    sheet.getCell(`B${row}`).value = line.position;
    sheet.getCell(`C${row}`).value = line.category ?? "";
    sheet.getCell(`D${row}`).value = line.description;
    sheet.getCell(`E${row}`).value = line.quantity;
    sheet.getCell(`F${row}`).value = line.unitPrice;
    sheet.getCell(`G${row}`).value = line.lineTotal;
  });

  const subtotalRow = TEMPLATE_ROW + itemCount;
  sheet.getCell(`G${subtotalRow}`).value = data.subtotal;
  sheet.getCell(`G${subtotalRow + 1}`).value = data.vatAmount;
  sheet.getCell(`G${subtotalRow + 2}`).value = data.grandTotal;

  const footerRow1 = subtotalRow + 5; // matches the template's fixed gap after totals
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`C${footerRow1}`).value = footerLine1;
  sheet.getCell(`C${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
