import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import { siteCodeFromDocumentNumber } from "@/modules/documents/domain/independent-document";
import type { LpoLineItemRow } from "@/modules/lpo/domain/line-item-rows";

/** True when both instants fall on the same calendar day in Dubai. */
export function isSameBusinessDay(a: Date, b: Date): boolean {
  const day = (date: Date) => formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
  return day(a) === day(b);
}

/** What the edit form starts with, worked out from a saved quotation. */
export type QuotationEditInitial = {
  siteCode: string;
  clientName: string;
  clientSubEntityName: string;
  clientTrn: string;
  address: string;
  paymentTerms: string;
  lines: LpoLineItemRow[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

/**
 * Reads the frozen snapshot of a generated quotation back into form values. Saved
 * lines hold the price after any discount, so the discount column starts empty and
 * the totals stay the same.
 */
export function quotationEditInitialFromSnapshot(
  snapshot: unknown,
  documentNumber: string,
): QuotationEditInitial {
  const root = asRecord(snapshot);
  const client = asRecord(root.client);
  const lineItems = Array.isArray(root.lineItems) ? root.lineItems : [];

  return {
    siteCode: asText(client.siteCode) || siteCodeFromDocumentNumber(documentNumber) || "",
    clientName: asText(client.clientName),
    clientSubEntityName: asText(client.clientSubEntityName),
    clientTrn: asText(client.clientTrn),
    address: asText(client.address),
    paymentTerms: asText(root.paymentTerms),
    lines: lineItems.map((item) => {
      const line = asRecord(item);
      return {
        category: asText(line.category),
        description: asText(line.description),
        articleNo: "",
        quantity: asNumberText(line.quantity),
        unitPrice: asNumberText(line.unitPrice),
        discountPercent: "",
      };
    }),
  };
}
