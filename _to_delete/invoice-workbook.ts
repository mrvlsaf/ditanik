import ExcelJS from "exceljs";

/**
 * v1 layout: built cell-by-cell in code from the sample Invoice.pdf, since the
 * real Deezano Excel workbook hasn't been shared yet (see
 * docs/DOCUMENT-GENERATION-PLAN.md §8). Once that file arrives, swap this
 * function's body for "load the template, fill named cells" — nothing in
 * generate-invoice.ts needs to change, since it only depends on this file's
 * exported signature.
 */

const NAVY = "FF1F2933";
const YELLOW = "FFFFF3B0";
const BLACK = "FF000000";
const WHITE = "FFFFFFFF";
const LIGHT_GRAY = "FFF3F4F6";
const BORDER_GRAY = "FFD1D5DB";

const thinBorder = {
  top: { style: "thin" as const, color: { argb: BORDER_GRAY } },
  left: { style: "thin" as const, color: { argb: BORDER_GRAY } },
  bottom: { style: "thin" as const, color: { argb: BORDER_GRAY } },
  right: { style: "thin" as const, color: { argb: BORDER_GRAY } },
};

export type InvoiceLineItemRow = {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceWorkbookData = {
  companyLegalName: string;
  companyTrn: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  documentNumber: string;
  documentDateLabel: string;
  lpoReference: string;
  clientTrn: string | null;
  clientSubEntityName: string | null;
  clientName: string;
  invoiceAddress: string;
  currency: string;
  lineItems: InvoiceLineItemRow[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  preparedByLabel: string | null;
};

function splitAddressLines(address: string): string[] {
  return address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function buildInvoiceWorkbook(
  data: InvoiceWorkbookData,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ditanik";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Tax Invoice", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "description", width: 52 },
    { key: "quantity", width: 12 },
    { key: "unitPrice", width: 16 },
    { key: "total", width: 16 },
  ];

  // --- Company header (left) ---
  sheet.mergeCells("A1:B1");
  const logoCell = sheet.getCell("A1");
  logoCell.value = "DEEZANO";
  logoCell.font = { bold: true, size: 18, color: { argb: WHITE } };
  logoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
  logoCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 28;

  sheet.getCell("A2").value = data.companyLegalName;
  sheet.getCell("A3").value = data.companyTrn ? `TRN: ${data.companyTrn}` : "";
  sheet.getCell("A4").value = data.companyPhone ?? "";
  const websiteCell = sheet.getCell("A5");
  if (data.companyWebsite) {
    websiteCell.value = { text: data.companyWebsite, hyperlink: data.companyWebsite };
    websiteCell.font = { color: { argb: "FF1D4ED8" }, underline: true };
  }
  sheet.getCell("A6").value = data.companyAddressLine1 ?? "";
  sheet.getCell("A7").value = data.companyAddressLine2 ?? "";

  // --- Document heading + number box (right) ---
  sheet.mergeCells("D2:E2");
  const headingCell = sheet.getCell("D2");
  headingCell.value = "TAX INVOICE";
  headingCell.font = { bold: true, size: 16 };
  headingCell.alignment = { horizontal: "right" };

  const numberBoxRows: Array<[string, string]> = [
    ["DATE", data.documentDateLabel],
    ["TAX INVOICE #", data.documentNumber],
    ["LPO REFERENCE", data.lpoReference],
  ];
  numberBoxRows.forEach(([label, value], index) => {
    const rowNumber = 4 + index;
    const labelCell = sheet.getCell(`D${rowNumber}`);
    const valueCell = sheet.getCell(`E${rowNumber}`);
    labelCell.value = label;
    labelCell.font = { bold: true };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
    labelCell.border = thinBorder;
    labelCell.alignment = { horizontal: "right" };
    valueCell.value = value;
    valueCell.border = thinBorder;
  });

  // --- Customer block ---
  sheet.mergeCells("A9:E9");
  const customerBar = sheet.getCell("A9");
  customerBar.value = "CUSTOMER";
  customerBar.font = { bold: true, color: { argb: WHITE } };
  customerBar.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };

  sheet.getCell("A10").value = data.clientTrn ? `TRN: ${data.clientTrn}` : "";
  sheet.getCell("A11").value = data.clientSubEntityName ?? "";
  sheet.getCell("A12").value = data.clientName;
  const addressLines = splitAddressLines(data.invoiceAddress);
  sheet.getCell("A13").value = addressLines[0] ?? "";
  sheet.getCell("A14").value = addressLines.slice(1).join(", ");

  // --- Line item table ---
  const tableHeaderRow = 16;
  const headerLabels = ["NO.", "DESCRIPTION", "QUANTITY", "AMOUNT PER UNIT", "TOTAL AMOUNT"];
  headerLabels.forEach((label, columnIndex) => {
    const cell = sheet.getRow(tableHeaderRow).getCell(columnIndex + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  let currentRow = tableHeaderRow + 1;
  for (const line of data.lineItems) {
    const row = sheet.getRow(currentRow);
    row.getCell(1).value = line.position;
    row.getCell(2).value = line.description;
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.getCell(3).value = line.quantity;
    row.getCell(4).value = line.unitPrice;
    row.getCell(5).value = line.lineTotal;
    for (let col = 1; col <= 5; col += 1) {
      const cell = row.getCell(col);
      cell.border = thinBorder;
      if (col >= 4) {
        cell.numFmt = "0.00";
      }
      if (col === 1 || col === 3) {
        cell.alignment = { ...cell.alignment, horizontal: "center" };
      }
    }
    currentRow += 1;
  }

  // --- Totals ---
  const totalsRows: Array<[string, number, boolean]> = [
    ["", data.subtotal, false],
    [`VAT ${data.vatPercent}%`, data.vatAmount, false],
    ["GRAND TOTAL", data.grandTotal, true],
  ];
  for (const [label, value, isGrandTotal] of totalsRows) {
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const labelCell = sheet.getCell(`A${currentRow}`);
    labelCell.value = label;
    labelCell.alignment = { horizontal: "right" };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };

    const valueCell = sheet.getCell(`E${currentRow}`);
    valueCell.value = value;
    valueCell.numFmt = "0.00";
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
    if (isGrandTotal) {
      labelCell.font = { bold: true };
      valueCell.font = { bold: true };
    }
    currentRow += 1;
  }

  currentRow += 2;

  // --- Footer ---
  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const footerLine1 = sheet.getCell(`A${currentRow}`);
  footerLine1.value = [data.companyLegalName, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(" , ");
  footerLine1.alignment = { horizontal: "center" };
  currentRow += 1;

  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const footerLine2 = sheet.getCell(`A${currentRow}`);
  footerLine2.value = data.companyAddressLine2 ?? "";
  footerLine2.font = { bold: true };
  footerLine2.alignment = { horizontal: "center" };
  currentRow += 2;

  if (data.preparedByLabel) {
    sheet.getCell(`A${currentRow}`).value = `Prepared by: ${data.preparedByLabel}`;
  }

  return workbook;
}
