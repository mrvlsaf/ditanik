import { describe, expect, it } from "vitest";

import {
  countInvoicesByType,
  fabricInvoiceRow,
  filterInvoiceRows,
  hasInvoiceFilters,
  invoiceMonths,
  invoicesListHref,
  parseInvoiceFilters,
  readSnapshotTotals,
  sortInvoiceRows,
  summariseVat,
  supplierInvoiceRow,
  taxInvoiceRow,
  type InvoiceRow,
} from "@/modules/invoices/domain/invoice-hub";

const at = (iso: string) => new Date(`${iso}T08:00:00.000Z`);

const rows: InvoiceRow[] = [
  taxInvoiceRow({
    id: "t1",
    documentNumber: "AHO-INV-05112026-01",
    generatedAt: at("2026-11-05"),
    clientName: "ABC Hotel",
    lpo: { id: "l1", lpoNumber: "45892", clientName: "ABC Hotel" },
    snapshot: { grandTotal: 5465.25, vatAmount: 260.25 },
    fileKey: "k1",
    fileName: "t1.xlsx",
  }),
  taxInvoiceRow({
    id: "t2",
    documentNumber: "LGH-INV-26102026-01",
    generatedAt: at("2026-10-26"),
    clientName: "Lighthouse Cafe",
    lpo: null,
    snapshot: { grandTotal: 1890, vatAmount: 90 },
    fileKey: "k2",
    fileName: "t2.xlsx",
  }),
  fabricInvoiceRow({
    id: "f1",
    supplierName: "Textile House",
    invoiceRef: "INV-2291",
    receivedDate: at("2026-11-03"),
    batchCount: 2,
    totalInclVat: 8400,
    fileKey: null,
    fileName: null,
  }),
  fabricInvoiceRow({
    id: "f2",
    supplierName: "Royal Fabrics",
    invoiceRef: "INV-0457",
    receivedDate: at("2026-10-28"),
    batchCount: 1,
    totalInclVat: null,
    fileKey: null,
    fileName: null,
  }),
  supplierInvoiceRow({
    id: "a1",
    type: "accessory",
    supplierName: "Button and Zip Co.",
    invoiceRef: null,
    receivedDate: at("2026-11-01"),
    total: 1260,
    vatAmount: 60,
    fileKey: "k3",
    fileName: "a1.pdf",
  }),
  supplierInvoiceRow({
    id: "m1",
    type: "manufacturing",
    supplierName: "Al Noor Tailoring",
    invoiceRef: "MFG-0912",
    receivedDate: at("2026-11-04"),
    total: 6300,
    vatAmount: 300,
    fileKey: "k4",
    fileName: "m1.pdf",
  }),
];

describe("invoice rows", () => {
  it("reads a tax invoice's totals from its frozen snapshot", () => {
    expect(rows[0]).toMatchObject({
      type: "tax",
      amount: 5465.25,
      vat: 260.25,
      linkLabel: "LPO 45892",
      linkHref: "/lpo/l1",
      hasLpo: true,
    });
    expect(rows[1]).toMatchObject({ linkLabel: null, hasLpo: false });
  });

  it("tolerates a snapshot without totals", () => {
    expect(readSnapshotTotals(null)).toEqual({ amount: null, vat: null });
    expect(readSnapshotTotals({ grandTotal: "x" })).toEqual({ amount: null, vat: null });
  });

  it("works the VAT inside a fabric invoice total and leaves it blank without one", () => {
    expect(rows[2]).toMatchObject({ amount: 8400, vat: 400, linkLabel: "2 batches" });
    expect(rows[3]).toMatchObject({ amount: null, vat: null, linkLabel: "1 batch" });
  });

  it("puts a month on each row in Dubai time", () => {
    expect(rows[0]!.month).toBe("2026-11");
    expect(
      supplierInvoiceRow({
        id: "x",
        type: "accessory",
        supplierName: "S",
        invoiceRef: null,
        // 21:00 UTC on 31 Oct is already 1 Nov in Dubai.
        receivedDate: new Date("2026-10-31T21:00:00.000Z"),
        total: 1,
        vatAmount: 0,
        fileKey: "k",
        fileName: "f",
      }).month,
    ).toBe("2026-11");
  });
});

describe("parseInvoiceFilters", () => {
  it("accepts known values and falls back to all", () => {
    expect(
      parseInvoiceFilters({ type: "fabric", month: "2026-11", q: " ab ", lpo: "with" }),
    ).toEqual({
      type: "fabric",
      month: "2026-11",
      q: "ab",
      lpo: "with",
    });
    expect(parseInvoiceFilters({ type: "bogus", month: "2026-13", lpo: "x" })).toEqual({
      type: "all",
      month: "all",
      q: "",
      lpo: "any",
    });
    expect(parseInvoiceFilters({ type: ["tax", "fabric"] }).type).toBe("tax");
  });

  it("builds addresses without the default values", () => {
    expect(invoicesListHref({})).toBe("/invoices");
    expect(invoicesListHref({ type: "all", lpo: "any" })).toBe("/invoices");
    expect(invoicesListHref({ type: "tax", month: "2026-11", q: "abc" })).toBe(
      "/invoices?type=tax&month=2026-11&q=abc",
    );
  });

  it("knows when any filter is on", () => {
    expect(hasInvoiceFilters(parseInvoiceFilters({}))).toBe(false);
    expect(hasInvoiceFilters(parseInvoiceFilters({ q: "x" }))).toBe(true);
  });
});

describe("filterInvoiceRows", () => {
  const all = parseInvoiceFilters({});

  it("filters by type and month", () => {
    expect(filterInvoiceRows(rows, { ...all, type: "tax" })).toHaveLength(2);
    expect(filterInvoiceRows(rows, { ...all, month: "2026-10" })).toHaveLength(2);
  });

  it("searches reference and client or supplier, ignoring case", () => {
    expect(filterInvoiceRows(rows, { ...all, q: "textile" }).map((r) => r.id)).toEqual([
      "f1",
    ]);
    expect(filterInvoiceRows(rows, { ...all, q: "mfg-09" }).map((r) => r.id)).toEqual([
      "m1",
    ]);
  });

  it("applies the LPO filter to tax invoices only", () => {
    const withLpo = filterInvoiceRows(rows, { ...all, lpo: "with" });
    expect(withLpo.filter((r) => r.type === "tax").map((r) => r.id)).toEqual(["t1"]);
    expect(withLpo.filter((r) => r.type !== "tax")).toHaveLength(4);
    const without = filterInvoiceRows(rows, { ...all, lpo: "without" });
    expect(without.filter((r) => r.type === "tax").map((r) => r.id)).toEqual(["t2"]);
  });
});

describe("lists and totals", () => {
  it("sorts newest first", () => {
    expect(sortInvoiceRows(rows).map((r) => r.id)).toEqual([
      "t1",
      "m1",
      "f1",
      "a1",
      "f2",
      "t2",
    ]);
  });

  it("counts each type and lists months newest first", () => {
    expect(countInvoicesByType(rows)).toEqual({
      all: 6,
      tax: 2,
      fabric: 2,
      accessory: 1,
      manufacturing: 1,
    });
    expect(invoiceMonths(rows)).toEqual(["2026-11", "2026-10"]);
  });

  it("splits VAT charged from VAT paid and notes rows with no total", () => {
    expect(summariseVat(rows)).toEqual({
      charged: 350.25,
      paid: 760,
      net: -409.75,
      withoutTotal: 1,
    });
    expect(summariseVat([])).toEqual({ charged: 0, paid: 0, net: 0, withoutTotal: 0 });
  });
});
