import { describe, expect, it } from "vitest";

import {
  calculateSupplierInvoice,
  calculateSupplierLine,
  previewSupplierInvoice,
  vatInsideTotal,
} from "@/modules/invoices/domain/supplier-invoice-lines";
import {
  parseSupplierInvoiceType,
  SUPPLIER_INVOICE_CARD_TEXT,
} from "@/modules/invoices/domain/invoice-types";

const line = (over = {}) => ({
  description: "Buttons, 15 mm",
  quantity: 2000,
  unitPrice: 0.5,
  vatPercent: 5,
  ...over,
});

describe("calculateSupplierLine", () => {
  it("works out the line total before VAT and its VAT", () => {
    expect(calculateSupplierLine(line())).toEqual({ lineTotal: 1000, vatAmount: 50 });
  });

  it("allows a zero VAT rate and decimal quantities", () => {
    expect(calculateSupplierLine(line({ vatPercent: 0 })).vatAmount).toBe(0);
    expect(calculateSupplierLine(line({ quantity: 2.5, unitPrice: 4 })).lineTotal).toBe(
      10,
    );
  });

  it("explains what is wrong, naming the line", () => {
    expect(() => calculateSupplierLine(line({ description: " " }), 2)).toThrow(
      "Add a description on line 2.",
    );
    expect(() => calculateSupplierLine(line({ quantity: 0 }))).toThrow(
      "Quantity must be more than 0",
    );
    expect(() => calculateSupplierLine(line({ unitPrice: -1 }))).toThrow(
      "Unit price cannot be negative",
    );
    expect(() => calculateSupplierLine(line({ vatPercent: 101 }))).toThrow("VAT %");
  });
});

describe("calculateSupplierInvoice", () => {
  it("matches the mockup: 1,200.00 + 60.00 VAT = 1,260.00", () => {
    const result = calculateSupplierInvoice([
      line(),
      line({ description: "Zips, 20 cm", quantity: 500, unitPrice: 0.4 }),
    ]);
    expect(result.totals).toEqual({ subtotal: 1200, vatAmount: 60, total: 1260 });
    expect(result.lines.map((l) => l.lineTotal)).toEqual([1000, 200]);
  });

  it("needs at least one line", () => {
    expect(() => calculateSupplierInvoice([])).toThrow("at least one");
  });

  it("adds each line's rounded VAT", () => {
    const result = calculateSupplierInvoice([
      line({ quantity: 1, unitPrice: 0.1, vatPercent: 5 }),
      line({ quantity: 1, unitPrice: 0.1, vatPercent: 5 }),
    ]);
    expect(result.totals.vatAmount).toBe(0.02);
  });
});

describe("previewSupplierInvoice", () => {
  it("skips half-typed rows instead of failing", () => {
    const preview = previewSupplierInvoice([
      { description: "Buttons", quantity: "2000", unitPrice: "0.5", vatPercent: "5" },
      { description: "", quantity: "", unitPrice: "", vatPercent: "5" },
    ]);
    expect(preview).toMatchObject({
      subtotal: 1000,
      vatAmount: 50,
      total: 1050,
      filledLines: 1,
    });
    expect(preview.lineAmounts).toEqual([1000, null]);
  });
});

describe("vatInsideTotal", () => {
  it("takes the 5% VAT out of a total that includes it", () => {
    expect(vatInsideTotal(8400)).toBe(400);
    expect(vatInsideTotal(5465.25)).toBe(260.25);
    expect(vatInsideTotal(0)).toBe(0);
  });
});

describe("supplier invoice types", () => {
  it("only accepts the two types added on the Add invoice page", () => {
    expect(parseSupplierInvoiceType("accessory")).toBe("accessory");
    expect(parseSupplierInvoiceType("fabric")).toBeNull();
    expect(parseSupplierInvoiceType(undefined)).toBeNull();
    expect(Object.keys(SUPPLIER_INVOICE_CARD_TEXT)).toEqual([
      "accessory",
      "manufacturing",
    ]);
  });
});
