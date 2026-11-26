import {
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateLineTotal,
  calculateVatAmount,
} from "@/modules/lpo/domain/line-items";

/** One line as typed into the LPO forms (everything is text until saved). */
export type LpoLineItemRow = {
  category: string;
  description: string;
  articleNo: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

export const EMPTY_LINE_ITEM_ROW: LpoLineItemRow = {
  category: "",
  description: "",
  articleNo: "",
  quantity: "",
  unitPrice: "",
  discountPercent: "",
};

/** Best-effort live total for one row; null while the row is incomplete or invalid. */
export function tryLineTotal(row: LpoLineItemRow): number | null {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unitPrice);
  const discountPercent = row.discountPercent ? Number(row.discountPercent) : 0;

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return null;
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return null;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return null;
  }

  try {
    return calculateLineTotal({ quantity, unitPrice, discountPercent });
  } catch {
    return null;
  }
}

export type LineItemSummary = {
  rowTotals: Array<number | null>;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  /** False while any row is incomplete; invalid rows are left out of the totals. */
  allRowsValid: boolean;
};

export function summariseLineItemRows(rows: readonly LpoLineItemRow[]): LineItemSummary {
  const rowTotals = rows.map(tryLineTotal);
  const subtotal = calculateLineItemsSubtotal(
    rowTotals
      .filter((total): total is number => total != null)
      .map((total) => ({ lineTotal: total })),
  );
  const vatAmount = calculateVatAmount(subtotal);
  return {
    rowTotals,
    subtotal,
    vatAmount,
    grandTotal: calculateGrandTotal(subtotal, vatAmount),
    allRowsValid: rowTotals.every((total) => total != null),
  };
}

/** The JSON the save actions read from the hidden `lineItemsJson` field. */
export function lineItemRowsToJson(rows: readonly LpoLineItemRow[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      category: row.category || undefined,
      description: row.description,
      articleNo: row.articleNo || undefined,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      discountPercent: row.discountPercent ? Number(row.discountPercent) : undefined,
    })),
  );
}
