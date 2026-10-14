import ExcelJS from "exceljs";

import {
  DEFAULT_QUOTATION_TERMS,
  calculateQuotationValidityDate,
} from "@/modules/documents/domain/quotation-terms";
import {
  loadTemplateWorkbook,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the Quotation template (the client's approved "QUOTATION" format):
 * logo + company block, DATE / QUOTE# / VALIDITY# box, CUSTOMER block, line
 * items (NO. / CATEGORY / DESCRIPTION / QUANTITY / AMOUNT PER UNIT / TOTAL
 * AMOUNT), yellow SUB TOTAL / VAT / GRAND TOTAL rows, the numbered TERMS AND
 * CONDITIONS box and the footer. The line-item table and the terms box both
 * grow/shrink to fit; everything below them shifts along.
 */

const TEMPLATE_ROW = 18; // the template's two sample line-item rows (18-19).
const TEMPLATE_ROW_COUNT = 2;

const TERMS_TEMPLATE_ROW_COUNT = 1; // the template ships with a single term row; it is grown to fit.
// Terms header sits 4 rows below the first totals row (SUB TOTAL); the first
// term one row after that — fixed offsets regardless of the item count.
const TERMS_FIRST_ROW_OFFSET = 5;
const TERMS_CHARS_PER_LINE = 88; // merged C:F width at the terms font size
const TERMS_LINE_HEIGHT = 13.5;

const TERMS_FONT_REGULAR = {
  family: 2,
  scheme: "minor" as const,
  size: 10,
  name: "Trebuchet MS",
  color: { argb: "FF101010" },
};
const TERMS_FONT_BOLD = { ...TERMS_FONT_REGULAR, bold: true };

const BLACK_BORDER: Partial<ExcelJS.Border> = {
  style: "medium",
  color: { argb: "FF000000" },
};
const THIN_BORDER: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: "FF000000" },
};

/**
 * Splits a clause into rich-text runs: the leading "Label:" and any
 * `**marked**` spans are bold, the rest regular.
 */
function termRichText(term: string): ExcelJS.CellRichTextValue | string {
  const colonIndex = term.indexOf(":");
  const label = colonIndex === -1 ? "" : term.slice(0, colonIndex + 1);
  const body = colonIndex === -1 ? term : term.slice(colonIndex + 1);

  const runs: ExcelJS.RichText[] = [];
  if (label) {
    runs.push({ font: TERMS_FONT_BOLD, text: label });
  }
  body.split("**").forEach((part, index) => {
    if (part === "") return;
    runs.push({
      font: index % 2 === 1 ? TERMS_FONT_BOLD : TERMS_FONT_REGULAR,
      text: part,
    });
  });
  return runs.length > 0 ? { richText: runs } : term;
}

/** Plain length of a clause once markup is removed, for row-height estimates. */
function visibleLength(term: string): number {
  return term.replaceAll("**", "").length;
}

function estimateTermRowHeight(term: string): number {
  const lines = Math.max(1, Math.ceil(visibleLength(term) / TERMS_CHARS_PER_LINE));
  return Math.max(30, Math.round(lines * TERMS_LINE_HEIGHT + 10));
}

export type QuotationLineItemRow = {
  position: number;
  category: string | null;
  description: string;
  quantity: number;
  /** Price per unit after any line discount. */
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
  /** Defaults to the document date + 30 days when omitted. */
  validityDate?: Date;
  clientTrn: string | null;
  clientSubEntityName: string | null;
  clientName: string;
  invoiceAddress: string;
  lineItems: QuotationLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  /** One clause per entry. Omit/empty to use DEFAULT_QUOTATION_TERMS. */
  termsAndConditions?: readonly string[] | null;
};

export async function buildQuotationWorkbook(
  data: QuotationWorkbookData,
): Promise<ExcelJS.Workbook> {
  const { workbook, sheet } = await loadTemplateWorkbook("quotation.xlsx");

  sheet.getCell("B3").value = data.companyLegalName;
  sheet.getCell("B4").value = data.companyTrn ? `TRN:${data.companyTrn}` : "";
  sheet.getCell("B5").value = data.companyPhone ?? "";
  sheet.getCell("B6").value = data.companyWebsite ?? "";
  sheet.getCell("B7").value = data.companyAddressLine1 ?? "";
  sheet.getCell("B8").value = data.companyAddressLine2 ?? "";

  sheet.getCell("G8").value = data.documentDate;
  sheet.getCell("G9").value = data.documentNumber;
  sheet.getCell("G10").value =
    data.validityDate ?? calculateQuotationValidityDate(data.documentDate);

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

  // ---- Terms & Conditions box
  const terms =
    data.termsAndConditions && data.termsAndConditions.length > 0
      ? data.termsAndConditions
      : DEFAULT_QUOTATION_TERMS;
  const termsFirstRow = subtotalRow + TERMS_FIRST_ROW_OFFSET;
  setLineItemRowCount(sheet, termsFirstRow, TERMS_TEMPLATE_ROW_COUNT, terms.length);

  terms.forEach((term, index) => {
    const row = termsFirstRow + index;
    // Rows cloned from the template row are not merged (only the template
    // row itself is), so merge each new one across C:F here.
    if (index >= TERMS_TEMPLATE_ROW_COUNT) {
      sheet.mergeCells(`C${row}:F${row}`);
    }

    const isLast = index === terms.length - 1;
    sheet.getRow(row).height = estimateTermRowHeight(term);

    const numberCell = sheet.getCell(`B${row}`);
    numberCell.value = index + 1;
    numberCell.font = TERMS_FONT_BOLD;
    numberCell.alignment = { horizontal: "center", vertical: "middle" };
    numberCell.border = {
      left: BLACK_BORDER,
      right: THIN_BORDER,
      ...(isLast ? { bottom: BLACK_BORDER } : {}),
    };

    const textCell = sheet.getCell(`C${row}`);
    textCell.value = termRichText(term);
    textCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (const column of ["C", "D", "E", "F"]) {
      sheet.getCell(`${column}${row}`).border = {
        ...(column === "F" ? { right: BLACK_BORDER } : {}),
        ...(isLast ? { bottom: BLACK_BORDER } : {}),
      };
    }
  });

  // ---- Footer: sits a fixed two rows below the terms box.
  const footerRow1 = termsFirstRow + terms.length + 2;
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`B${footerRow1}`).value = footerLine1;
  sheet.getCell(`B${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
