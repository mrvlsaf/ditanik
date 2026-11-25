/** VAT rate pre-filled on every new invoice line (UAE standard rate). */
export const DEFAULT_SUPPLIER_VAT_PERCENT = 5;

export type SupplierInvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
};

export type SupplierInvoiceLineAmounts = {
  /** Quantity times unit price, before VAT. */
  lineTotal: number;
  vatAmount: number;
};

export type SupplierInvoiceTotals = {
  subtotal: number;
  vatAmount: number;
  total: number;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Checks one line and works out its total and VAT. Throws a readable message if it is not valid. */
export function calculateSupplierLine(
  line: SupplierInvoiceLineInput,
  position?: number,
): SupplierInvoiceLineAmounts {
  const where = position ? ` on line ${position}` : "";
  if (!line.description.trim()) {
    throw new Error(`Add a description${where}.`);
  }
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    throw new Error(`Quantity must be more than 0${where}.`);
  }
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
    throw new Error(`Unit price cannot be negative${where}.`);
  }
  if (!Number.isFinite(line.vatPercent) || line.vatPercent < 0 || line.vatPercent > 100) {
    throw new Error(`VAT % must be between 0 and 100${where}.`);
  }
  const lineTotal = roundMoney(line.quantity * line.unitPrice);
  return { lineTotal, vatAmount: roundMoney((lineTotal * line.vatPercent) / 100) };
}

/** Subtotal, VAT and total for a whole invoice. VAT is the sum of each line's rounded VAT. */
export function calculateSupplierInvoice(
  lines: ReadonlyArray<SupplierInvoiceLineInput>,
): {
  lines: SupplierInvoiceLineAmounts[];
  totals: SupplierInvoiceTotals;
} {
  if (lines.length === 0) {
    throw new Error("Add at least one invoice line.");
  }
  const amounts = lines.map((line, index) => calculateSupplierLine(line, index + 1));
  const subtotal = roundMoney(amounts.reduce((sum, a) => sum + a.lineTotal, 0));
  const vatAmount = roundMoney(amounts.reduce((sum, a) => sum + a.vatAmount, 0));
  return {
    lines: amounts,
    totals: { subtotal, vatAmount, total: roundMoney(subtotal + vatAmount) },
  };
}

/**
 * Totals for the live summary while someone is typing: rows that are not
 * valid yet (empty or half-typed) are skipped instead of throwing.
 */
export function previewSupplierInvoice(
  lines: ReadonlyArray<{
    description: string;
    quantity: string;
    unitPrice: string;
    vatPercent: string;
  }>,
): SupplierInvoiceTotals & { lineAmounts: Array<number | null>; filledLines: number } {
  let subtotal = 0;
  let vatAmount = 0;
  let filledLines = 0;
  const lineAmounts = lines.map((row) => {
    try {
      const amounts = calculateSupplierLine({
        description: row.description,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        vatPercent: row.vatPercent.trim() === "" ? 0 : Number(row.vatPercent),
      });
      subtotal += amounts.lineTotal;
      vatAmount += amounts.vatAmount;
      filledLines += 1;
      return amounts.lineTotal;
    } catch {
      return null;
    }
  });
  subtotal = roundMoney(subtotal);
  vatAmount = roundMoney(vatAmount);
  return {
    subtotal,
    vatAmount,
    total: roundMoney(subtotal + vatAmount),
    lineAmounts,
    filledLines,
  };
}

/** The VAT inside a total that already includes it, at the standard rate (fabric invoices). */
export function vatInsideTotal(
  totalInclVat: number,
  vatPercent = DEFAULT_SUPPLIER_VAT_PERCENT,
): number {
  return roundMoney((totalInclVat * vatPercent) / (100 + vatPercent));
}
