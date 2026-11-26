import ExcelJS from "exceljs";

import { calculateQuotationValidityDate } from "@/modules/documents/domain/quotation-terms";
import {
  loadTemplateWorkbook,
  removeTemplateRows,
  setLineItemRowCount,
} from "@/modules/documents/infrastructure/workbook-template";

/**
 * Fills the client's approved QUOTATION template: header, customer block, item
 * table, totals, numbered terms box and footer. The item table and terms box
 * grow or shrink to fit; everything below shifts.
 */

const CUSTOMER_FIRST_ROW = 11; // the customer block has five rows (11-15), one line each.
const CUSTOMER_TEMPLATE_ROW_COUNT = 5;
const TEMPLATE_ROW = 18; // the template's two sample line-item rows (18-19).
const TEMPLATE_ROW_COUNT = 2;

const TERMS_TEMPLATE_ROW_COUNT = 1; // the template ships with a single term row; it is grown to fit.
// Terms header is 4 rows below SUB TOTAL; the first term one row after.
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
  /** One clause per entry. Omit/empty to print no Terms & Conditions box. */
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

  // Customer block: one row per line (TRN, name, branch, then each address line).
  const customerLines = [
    data.clientTrn ? `TRN: ${data.clientTrn}` : "",
    data.clientName,
    data.clientSubEntityName ?? "",
    ...data.invoiceAddress.split(/\r?\n/),
  ]
    .map((line) => line.trim())
    .filter(Boolean);
  const customerRowCount = Math.max(customerLines.length, 1);
  setLineItemRowCount(
    sheet,
    CUSTOMER_FIRST_ROW,
    CUSTOMER_TEMPLATE_ROW_COUNT,
    customerRowCount,
  );
  customerLines.forEach((line, index) => {
    const row = CUSTOMER_FIRST_ROW + index;
    // Cloned rows are not merged (only the template rows are), so merge B:D here.
    if (index >= CUSTOMER_TEMPLATE_ROW_COUNT) {
      sheet.mergeCells(`B${row}:D${row}`);
    }
    sheet.getCell(`B${row}`).value = line;
  });

  const itemsFirstRow = TEMPLATE_ROW + customerRowCount - CUSTOMER_TEMPLATE_ROW_COUNT;
  const itemCount = Math.max(data.lineItems.length, 1);
  setLineItemRowCount(sheet, itemsFirstRow, TEMPLATE_ROW_COUNT, itemCount);

  data.lineItems.forEach((line, index) => {
    const row = itemsFirstRow + index;
    sheet.getCell(`B${row}`).value = line.position;
    sheet.getCell(`C${row}`).value = line.category ?? "";
    sheet.getCell(`D${row}`).value = line.description;
    sheet.getCell(`E${row}`).value = line.quantity;
    sheet.getCell(`F${row}`).value = line.unitPrice;
    sheet.getCell(`G${row}`).value = line.lineTotal;
  });

  const subtotalRow = itemsFirstRow + itemCount;
  sheet.getCell(`G${subtotalRow}`).value = data.subtotal;
  sheet.getCell(`G${subtotalRow + 1}`).value = data.vatAmount;
  sheet.getCell(`G${subtotalRow + 2}`).value = data.grandTotal;

  // ---- Terms & Conditions box
  const terms = data.termsAndConditions ?? [];
  const termsFirstRow = subtotalRow + TERMS_FIRST_ROW_OFFSET;
  if (terms.length > 0) {
    setLineItemRowCount(sheet, termsFirstRow, TERMS_TEMPLATE_ROW_COUNT, terms.length);
  } else {
    // No terms: drop the heading and sample clause rows.
    removeTemplateRows(sheet, termsFirstRow - 1, 2);
  }

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
  const footerRow1 =
    terms.length > 0 ? termsFirstRow + terms.length + 2 : subtotalRow + 6;
  const footerLine1 = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  sheet.getCell(`B${footerRow1}`).value = footerLine1;
  sheet.getCell(`B${footerRow1 + 1}`).value = data.companyAddressLine2 ?? "";

  return workbook;
}
