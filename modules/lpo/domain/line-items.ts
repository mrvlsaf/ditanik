/** UAE VAT applied to LPO commercial totals unless a document overrides it at generation time. */
export const DEFAULT_VAT_PERCENT = 5;

export type LpoLineItemInput = {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
};

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/** quantity × unitPrice, less discountPercent — the same math as the client's own templates. */
export function calculateLineTotal(input: LpoLineItemInput): number {
  const { quantity, unitPrice, discountPercent = 0 } = input;

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be an integer of at least 1.");
  }
  if (!(unitPrice >= 0)) {
    throw new Error("Unit price must be 0 or greater.");
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("Discount percent must be between 0 and 100.");
  }

  const gross = quantity * unitPrice;
  const discounted = gross * (1 - discountPercent / 100);
  return roundCurrency(discounted);
}

export function calculateLineItemsSubtotal(
  lines: ReadonlyArray<{ lineTotal: number }>,
): number {
  return roundCurrency(lines.reduce((sum, line) => sum + line.lineTotal, 0));
}

export function calculateVatAmount(
  subtotal: number,
  vatPercent: number = DEFAULT_VAT_PERCENT,
): number {
  return roundCurrency(subtotal * (vatPercent / 100));
}

export function calculateGrandTotal(subtotal: number, vatAmount: number): number {
  return roundCurrency(subtotal + vatAmount);
}
