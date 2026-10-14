import { z } from "zod";

import { calculateLineTotal, roundCurrency } from "@/modules/lpo/domain/line-items";
import { lpoLineItemSchema } from "@/modules/lpo/schemas/line-items";

export const INDEPENDENT_DOCUMENT_TYPES = [
  "QUOTATION",
  "TAX_INVOICE",
  "DELIVERY_NOTE",
] as const;

export type IndependentDocumentType = (typeof INDEPENDENT_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<IndependentDocumentType, string> = {
  QUOTATION: "Quotation",
  TAX_INVOICE: "Tax Invoice",
  DELIVERY_NOTE: "Delivery Note",
};

export function documentTypeLabel(type: string): string {
  return (
    DOCUMENT_TYPE_LABEL[type as IndependentDocumentType] ?? type.replaceAll("_", " ")
  );
}

/**
 * Everything typed on the "New document" form. Client details are free text —
 * there is deliberately no link to an LPO or a client record (D-030).
 */
export const independentDocumentSchema = z.object({
  type: z.enum(INDEPENDENT_DOCUMENT_TYPES, {
    message: "Choose a document type.",
  }),
  siteCode: z
    .string()
    .trim()
    .min(1, "Site code is required.")
    .max(20, "Site code must be 20 characters or fewer.")
    .regex(/^[A-Za-z0-9-]+$/, "Site code may only contain letters, numbers and hyphens."),
  clientName: z.string().trim().min(1, "Client name is required.").max(200),
  clientSubEntityName: z.string().trim().max(200).optional(),
  clientTrn: z.string().trim().max(50).optional(),
  address: z.string().trim().min(1, "Address is required.").max(1000),
  /** Tax Invoice: printed in the LPO-reference box. Delivery Note: LPO reference. */
  lpoReference: z.string().trim().max(100).optional(),
  /** Delivery Note only. */
  noteType: z.string().trim().max(100).optional(),
  dispatchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Dispatch date must be a valid date.")
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  lineItems: z
    .array(lpoLineItemSchema)
    .min(1, "At least one line item is required.")
    .max(100, "A document can have at most 100 line items."),
});

export type IndependentDocumentValues = z.infer<typeof independentDocumentSchema>;

export type IndependentLineRow = {
  position: number;
  category: string | null;
  description: string;
  quantity: number;
  /** Price per unit after any line discount, so it agrees with `lineTotal`. */
  unitPrice: number;
  lineTotal: number;
};

/** Typed line items → printed rows (1-based positions, discounted unit price). */
export function toIndependentLineRows(
  lineItems: ReadonlyArray<IndependentDocumentValues["lineItems"][number]>,
): IndependentLineRow[] {
  return lineItems.map((line, index) => {
    const discountPercent = line.discountPercent ?? 0;
    return {
      position: index + 1,
      category: line.category?.trim() || null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: roundCurrency(line.unitPrice * (1 - discountPercent / 100)),
      lineTotal: calculateLineTotal({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent,
      }),
    };
  });
}

/** `AHO-INV-23072026-09` → `AHO` (site codes may themselves contain hyphens). */
export function siteCodeFromDocumentNumber(documentNumber: string): string | null {
  const match = /^(.+)-(?:QTN|INV|DN)-\d{8}-\d+$/.exec(documentNumber);
  return match?.[1] ?? null;
}
