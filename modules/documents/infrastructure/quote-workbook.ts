import ExcelJS from "exceljs";

import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the real Quote template — extracted from the client's own workbook
 * (REVISED QUOTE.01.xlsx, "Quote 1" tab), see
 * docs/DOCUMENT-GENERATION-PLAN.md §8. Distinct from Quotation: adds an
 * Original/Discount/Revised pricing table and a Terms & Conditions block.
 * The T&Cs block ships in the template with its own real 16-point text; when
 * `termsAndConditions` is supplied (from CompanyProfile.defaultTermsText —
 * one point per line) it's used instead, growing or shrinking the block the
 * same way the line-item table does. Left undefined/empty, the template's
 * own static text is kept as-is.
 */

const TEMPLATE_ROW = 18; // the template's seven sample line-item rows (18-24).
const TEMPLATE_ROW_COUNT = 7;

const TERMS_ROW_COUNT = 16; // the template's sixteen static Terms & Conditions rows.

const TERMS_FONT_REGULAR = {
  family: 2,
  scheme: "minor" as const,
  size: 11,
  name: "Trebuchet MS",
  color: { argb: "FF101010" },
};
const TERMS_FONT_BOLD = { ...TERMS_FONT_REGULAR, bold: true };

/** Bolds a leading "Label:" prefix (matching the template's own style) when a term has one. */
function termRichText(term: string): ExcelJS.CellRichTextValue | string {
  const colonIndex = term.indexOf(":");
  if (colonIndex === -1) {
    return term;
  }
  return {
    richText: [
      { font: TERMS_FONT_BOLD, text: term.slice(0, colonIndex + 1) },
      { font: TERMS_FONT_REGULAR, text: term.slice(colonIndex + 1) },
    ],
  };
}

export type QuoteLineItemRow = {
  category: string | null;
  description: string;
  quantity: number;
  originalUnitPrice: number;
  discountPercent: number;
  revisedUnitPrice: number;
  revisedTotalPrice: number;
};

export type QuoteWorkbookData = {
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
  lineItems: QuoteLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  /** One Terms & Conditions point per entry. Omit/empty to keep the template's own static text. */
  termsAndConditions?: string[] | null;
};

export async function buildQuoteWorkbook(
  data: QuoteWorkbookData,
): Promise<ExcelJS.Workbook> {
  const { workbook, sheet } = await loadTemplateWorkbook("quote.xlsx");

  sheet.getCell("B4").value = data.companyTrn ? `TRN:${data.companyTrn}` : "";
  sheet.getCell("B5").value = data.companyPhone ?? "";
  sheet.getCell("B6").value = data.companyWebsite ?? "";
  sheet.getCell("B7").value = data.companyAddressLine1 ?? "";
  sheet.getCell("B8").value = data.companyAddressLine2 ?? "";

  sheet.getCell("G4").value = data.documentDate;
  sheet.getCell("G5").value = data.documentNumber;

  sheet.getCell("B11").value = data.clientTrn ? `TRN: ${data.clientTrn}` : "";
  sheet.getCell("B12").value = data.clientName;
  sheet.getCell("B13").value = data.clientSubEntityName ?? "";
  sheet.getCell("B14").value = data.invoiceAddress;

  const itemCount = Math.max(data.lineItems.length, 1);
  setLineItemRowCount(sheet, TEMPLATE_ROW, TEMPLATE_ROW_COUNT, itemCount);

  data.lineItems.forEach((line, index) => {
    const row = TEMPLATE_ROW + index;
    sheet.getCell(`B${row}`).value = line.category ?? "";
    sheet.getCell(`C${row}`).value = line.description;
    sheet.getCell(`D${row}`).value = line.quantity;
    sheet.getCell(`E${row}`).value = line.originalUnitPrice;
    sheet.getCell(`F${row}`).value = line.discountPercent / 100;
    sheet.getCell(`G${row}`).value = line.revisedUnitPrice;
    sheet.getCell(`H${row}`).value = line.revisedTotalPrice;
  });

  const subtotalRow = TEMPLATE_ROW + itemCount;
  sheet.getCell(`H${subtotalRow}`).value = data.subtotal;
  sheet.getCell(`H${subtotalRow + 1}`).value = data.vatAmount;
  sheet.getCell(`H${subtotalRow + 2}`).value = data.grandTotal;

  // Terms & Conditions header sits 4 rows below the totals; its points start
  // one row after that — both fixed offsets regardless of item count, since
  // everything below the items table shifted together above.
  const termsFirstRow = subtotalRow + 5;
  let termsRowCount = TERMS_ROW_COUNT;
  if (data.termsAndConditions && data.termsAndConditions.length > 0) {
    termsRowCount = data.termsAndConditions.length;
    setLineItemRowCount(sheet, termsFirstRow, TERMS_ROW_COUNT, termsRowCount);
    data.termsAndConditions.forEach((term, index) => {
      const row = termsFirstRow + index;
      sheet.getCell(`B${row}`).value = index + 1;
      sheet.getCell(`C${row}`).value = termRichText(term);
    });
  }

  const footerRow1 = termsFirstRow + termsRowCount + 2; // matches the template's fixed gap after the T&Cs block
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`C${footerRow1}`).value = footerLine1;
  sheet.getCell(`C${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
