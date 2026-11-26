import { describe, expect, it } from "vitest";

import {
  documentTypeTone,
  documentsListHref,
  hasDocumentFilters,
  parseDocumentFilters,
} from "@/modules/documents/domain/documents-filters";

describe("parseDocumentFilters", () => {
  it("reads known values", () => {
    expect(
      parseDocumentFilters({ type: "QUOTATION", source: "lpo", q: " ABC " }),
    ).toEqual({ type: "QUOTATION", source: "lpo", q: "ABC" });
  });

  it("falls back to All for unknown values and takes the first of a list", () => {
    expect(
      parseDocumentFilters({ type: "NOPE", source: ["independent", "lpo"] }),
    ).toEqual({
      type: "",
      source: "independent",
      q: "",
    });
    expect(parseDocumentFilters({})).toEqual({ type: "", source: "", q: "" });
  });
});

describe("documentsListHref", () => {
  it("leaves out All values", () => {
    expect(documentsListHref({})).toBe("/documents");
    expect(documentsListHref({ type: "TAX_INVOICE" })).toBe(
      "/documents?type=TAX_INVOICE",
    );
  });

  it("keeps the other filters when one changes", () => {
    expect(documentsListHref({ type: "QUOTATION", source: "lpo", q: "ABC 1" })).toBe(
      "/documents?type=QUOTATION&source=lpo&q=ABC+1",
    );
  });
});

describe("helpers", () => {
  it("detects active filters", () => {
    expect(hasDocumentFilters({ type: "", source: "", q: "" })).toBe(false);
    expect(hasDocumentFilters({ type: "", source: "", q: "x" })).toBe(true);
  });

  it("colours each type", () => {
    expect(documentTypeTone("QUOTATION")).toBe("blue");
    expect(documentTypeTone("TAX_INVOICE")).toBe("green");
    expect(documentTypeTone("DELIVERY_NOTE")).toBe("amber");
    expect(documentTypeTone("OTHER")).toBe("gray");
  });
});
