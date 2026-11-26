import { trimmedParam } from "@/lib/search-params";

/**
 * Filters on the Documents list. They live in the address (?type=&source=&q=)
 * so a filtered list survives a refresh and can be shared as a link.
 */

export const DOCUMENT_TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "QUOTATION", label: "Quotation" },
  { key: "TAX_INVOICE", label: "Tax invoice" },
  { key: "DELIVERY_NOTE", label: "Delivery note" },
] as const;

export const DOCUMENT_SOURCE_FILTERS = [
  { key: "", label: "All" },
  { key: "lpo", label: "Linked to an LPO" },
  { key: "independent", label: "Not linked" },
] as const;

export type DocumentFilters = {
  type: string;
  source: string;
  q: string;
};

/** Reads the three filters from the address; anything unknown becomes "All". */
export function parseDocumentFilters(params: {
  type?: string | string[];
  source?: string | string[];
  q?: string | string[];
}): DocumentFilters {
  const type = trimmedParam(params.type);
  const source = trimmedParam(params.source);
  return {
    type: DOCUMENT_TYPE_FILTERS.some((item) => item.key === type) ? type : "",
    source: DOCUMENT_SOURCE_FILTERS.some((item) => item.key === source) ? source : "",
    q: trimmedParam(params.q),
  };
}

/** The Documents address for a set of filters; "All" values are left out. */
export function documentsListHref(filters: Partial<DocumentFilters>): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.source) params.set("source", filters.source);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/documents?${query}` : "/documents";
}

export function hasDocumentFilters(filters: DocumentFilters): boolean {
  return Boolean(filters.type || filters.source || filters.q);
}

export type DocumentTone = "blue" | "green" | "amber" | "gray";

/** Chip colour for a document type: quotation blue, tax invoice green, delivery note amber. */
export function documentTypeTone(type: string): DocumentTone {
  switch (type) {
    case "QUOTATION":
      return "blue";
    case "TAX_INVOICE":
      return "green";
    case "DELIVERY_NOTE":
      return "amber";
    default:
      return "gray";
  }
}
