import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import { INVOICE_TYPES, type InvoiceType } from "@/modules/invoices/domain/invoice-types";
import {
  roundMoney,
  vatInsideTotal,
} from "@/modules/invoices/domain/supplier-invoice-lines";
import { trimmedParam } from "@/lib/search-params";

/** One row in the Invoices list, whichever kind of invoice it came from. */
export type InvoiceRow = {
  /** Unique across kinds, for React keys. */
  key: string;
  id: string;
  type: InvoiceType;
  date: Date;
  /** Dubai calendar month, "2026-11". */
  month: string;
  /** Client (tax invoices) or supplier (the rest). */
  party: string;
  /** The invoice number or reference; null when none was given. */
  reference: string | null;
  /** What it is linked to: an LPO number, "3 batches", or null when nothing. */
  linkLabel: string | null;
  linkHref: string | null;
  /** Tax invoices only: whether it was made from an LPO. */
  hasLpo: boolean;
  /** Total including VAT; null when unknown (a fabric invoice saved without a total). */
  amount: number | null;
  vat: number | null;
  fileKey: string | null;
  fileName: string | null;
};

export function dubaiMonthKey(date: Date): string {
  return format(toZonedTime(date, BUSINESS_TIMEZONE), "yyyy-MM");
}

/** Amount and VAT stored on a tax invoice's frozen snapshot; nulls when the snapshot lacks them. */
export function readSnapshotTotals(snapshot: unknown): {
  amount: number | null;
  vat: number | null;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { amount: null, vat: null };
  }
  const record = snapshot as Record<string, unknown>;
  const asNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return { amount: asNumber(record.grandTotal), vat: asNumber(record.vatAmount) };
}

export function taxInvoiceRow(input: {
  id: string;
  documentNumber: string;
  generatedAt: Date;
  clientName: string | null;
  lpo: { id: string; lpoNumber: string; clientName: string } | null;
  snapshot: unknown;
  fileKey: string;
  fileName: string;
}): InvoiceRow {
  const totals = readSnapshotTotals(input.snapshot);
  return {
    key: `tax:${input.id}`,
    id: input.id,
    type: "tax",
    date: input.generatedAt,
    month: dubaiMonthKey(input.generatedAt),
    party: input.clientName ?? input.lpo?.clientName ?? "Unknown client",
    reference: input.documentNumber,
    linkLabel: input.lpo ? `LPO ${input.lpo.lpoNumber}` : null,
    linkHref: input.lpo ? `/lpo/${input.lpo.id}` : null,
    hasLpo: Boolean(input.lpo),
    amount: totals.amount,
    vat: totals.vat,
    fileKey: input.fileKey,
    fileName: input.fileName,
  };
}

export function fabricInvoiceRow(input: {
  id: string;
  supplierName: string;
  invoiceRef: string;
  receivedDate: Date;
  batchCount: number;
  totalInclVat: number | null;
  fileKey: string | null;
  fileName: string | null;
}): InvoiceRow {
  return {
    key: `fabric:${input.id}`,
    id: input.id,
    type: "fabric",
    date: input.receivedDate,
    month: dubaiMonthKey(input.receivedDate),
    party: input.supplierName,
    reference: input.invoiceRef,
    linkLabel: `${input.batchCount} ${input.batchCount === 1 ? "batch" : "batches"}`,
    linkHref: "/fabric",
    hasLpo: false,
    amount: input.totalInclVat,
    vat: input.totalInclVat === null ? null : vatInsideTotal(input.totalInclVat),
    fileKey: input.fileKey,
    fileName: input.fileName,
  };
}

export function supplierInvoiceRow(input: {
  id: string;
  type: "accessory" | "manufacturing";
  supplierName: string;
  invoiceRef: string | null;
  receivedDate: Date;
  total: number;
  vatAmount: number;
  fileKey: string;
  fileName: string;
}): InvoiceRow {
  return {
    key: `${input.type}:${input.id}`,
    id: input.id,
    type: input.type,
    date: input.receivedDate,
    month: dubaiMonthKey(input.receivedDate),
    party: input.supplierName,
    reference: input.invoiceRef,
    linkLabel: null,
    linkHref: null,
    hasLpo: false,
    amount: input.total,
    vat: input.vatAmount,
    fileKey: input.fileKey,
    fileName: input.fileName,
  };
}

/* ------------------------------ filters ------------------------------ */

export const TAX_LPO_FILTERS = [
  { key: "any", label: "All" },
  { key: "with", label: "With an LPO" },
  { key: "without", label: "Without an LPO" },
] as const;
export type TaxLpoFilter = (typeof TAX_LPO_FILTERS)[number]["key"];

export type InvoiceFilters = {
  /** "all" or one invoice type. */
  type: InvoiceType | "all";
  /** "all" or "yyyy-MM". */
  month: string;
  q: string;
  /** Applies to tax invoices only. */
  lpo: TaxLpoFilter;
};

/** Reads ?type=&month=&q=&lpo=; anything unknown becomes "all". */
export function parseInvoiceFilters(params: {
  type?: string | string[];
  month?: string | string[];
  q?: string | string[];
  lpo?: string | string[];
}): InvoiceFilters {
  const type = trimmedParam(params.type);
  const month = trimmedParam(params.month);
  const lpo = trimmedParam(params.lpo);
  return {
    type: INVOICE_TYPES.find((t) => t === type) ?? "all",
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "all",
    q: trimmedParam(params.q),
    lpo: TAX_LPO_FILTERS.find((f) => f.key === lpo)?.key ?? "any",
  };
}

export function hasInvoiceFilters(filters: InvoiceFilters): boolean {
  return (
    filters.type !== "all" ||
    filters.month !== "all" ||
    filters.q !== "" ||
    filters.lpo !== "any"
  );
}

/** The Invoices address for a set of filters; "all" values are left out. */
export function invoicesListHref(filters: Partial<InvoiceFilters>): string {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.month && filters.month !== "all") params.set("month", filters.month);
  if (filters.q) params.set("q", filters.q);
  if (filters.lpo && filters.lpo !== "any") params.set("lpo", filters.lpo);
  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

export function filterInvoiceRows(
  rows: readonly InvoiceRow[],
  filters: InvoiceFilters,
): InvoiceRow[] {
  const q = filters.q.toLowerCase();
  return rows.filter((row) => {
    if (filters.type !== "all" && row.type !== filters.type) return false;
    if (filters.month !== "all" && row.month !== filters.month) return false;
    if (q) {
      const haystack = `${row.reference ?? ""} ${row.party}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // The LPO filter is about tax invoices only; other kinds are never hidden by it.
    if (filters.lpo !== "any" && row.type === "tax") {
      if (filters.lpo === "with" ? !row.hasLpo : row.hasLpo) return false;
    }
    return true;
  });
}

/** Newest first; ties keep a stable order by key. */
export function sortInvoiceRows(rows: readonly InvoiceRow[]): InvoiceRow[] {
  return [...rows].sort(
    (a, b) => b.date.getTime() - a.date.getTime() || a.key.localeCompare(b.key),
  );
}

/** How many rows each type card shows (the type filter is not applied to these). */
export function countInvoicesByType(
  rows: readonly InvoiceRow[],
): Record<InvoiceType | "all", number> {
  const counts: Record<InvoiceType | "all", number> = {
    all: rows.length,
    tax: 0,
    fabric: 0,
    accessory: 0,
    manufacturing: 0,
  };
  for (const row of rows) {
    counts[row.type] += 1;
  }
  return counts;
}

/** Months that have invoices, newest first, for the Month filter. */
export function invoiceMonths(rows: readonly InvoiceRow[]): string[] {
  return [...new Set(rows.map((row) => row.month))].sort((a, b) => b.localeCompare(a));
}

export type VatSummary = {
  /** VAT on tax invoices you sent. */
  charged: number;
  /** VAT on invoices you received. */
  paid: number;
  net: number;
  /** Rows left out of the totals because they have no amount (fabric invoices saved without a total). */
  withoutTotal: number;
};

export function summariseVat(rows: readonly InvoiceRow[]): VatSummary {
  let charged = 0;
  let paid = 0;
  let withoutTotal = 0;
  for (const row of rows) {
    if (row.vat === null) {
      withoutTotal += 1;
      continue;
    }
    if (row.type === "tax") {
      charged += row.vat;
    } else {
      paid += row.vat;
    }
  }
  charged = roundMoney(charged);
  paid = roundMoney(paid);
  return { charged, paid, net: roundMoney(charged - paid), withoutTotal };
}
