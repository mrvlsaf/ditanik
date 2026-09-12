import { describe, expect, it } from "vitest";

import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateLineTotal,
  calculateVatAmount,
  roundCurrency,
} from "@/modules/lpo/domain/line-items";

describe("roundCurrency", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundCurrency(10.005)).toBeCloseTo(10.01, 2);
    expect(roundCurrency(10.001)).toBe(10);
    expect(roundCurrency(10)).toBe(10);
  });
});

describe("calculateLineTotal", () => {
  it("computes quantity × unitPrice with no discount", () => {
    expect(calculateLineTotal({ quantity: 3, unitPrice: 25 })).toBe(75);
  });

  it("applies a discount percent", () => {
    expect(
      calculateLineTotal({ quantity: 10, unitPrice: 20, discountPercent: 10 }),
    ).toBe(180);
  });

  it("rounds the result to 2 decimal places", () => {
    expect(
      calculateLineTotal({ quantity: 3, unitPrice: 10.336, discountPercent: 0 }),
    ).toBe(31.01);
  });

  it("treats a missing discount as zero", () => {
    expect(calculateLineTotal({ quantity: 1, unitPrice: 99.99 })).toBe(99.99);
  });

  it("rejects a non-integer quantity", () => {
    expect(() => calculateLineTotal({ quantity: 1.5, unitPrice: 10 })).toThrow(
      /Quantity must be an integer/i,
    );
  });

  it("rejects a quantity below 1", () => {
    expect(() => calculateLineTotal({ quantity: 0, unitPrice: 10 })).toThrow(
      /Quantity must be an integer/i,
    );
  });

  it("rejects a negative unit price", () => {
    expect(() => calculateLineTotal({ quantity: 1, unitPrice: -5 })).toThrow(
      /Unit price must be 0 or greater/i,
    );
  });

  it("rejects a discount percent below 0", () => {
    expect(() =>
      calculateLineTotal({ quantity: 1, unitPrice: 10, discountPercent: -1 }),
    ).toThrow(/Discount percent must be between 0 and 100/i);
  });

  it("rejects a discount percent above 100", () => {
    expect(() =>
      calculateLineTotal({ quantity: 1, unitPrice: 10, discountPercent: 101 }),
    ).toThrow(/Discount percent must be between 0 and 100/i);
  });

  it("allows a 100 percent discount (free line)", () => {
    expect(
      calculateLineTotal({ quantity: 5, unitPrice: 10, discountPercent: 100 }),
    ).toBe(0);
  });

  it("allows a zero unit price", () => {
    expect(calculateLineTotal({ quantity: 5, unitPrice: 0 })).toBe(0);
  });
});

describe("calculateLineItemsSubtotal", () => {
  it("sums line totals", () => {
    expect(
      calculateLineItemsSubtotal([
        { lineTotal: 100 },
        { lineTotal: 250.5 },
        { lineTotal: 10 },
      ]),
    ).toBe(360.5);
  });

  it("returns 0 for an empty list", () => {
    expect(calculateLineItemsSubtotal([])).toBe(0);
  });

  it("rounds the summed result", () => {
    expect(
      calculateLineItemsSubtotal([{ lineTotal: 10.005 }, { lineTotal: 10.005 }]),
    ).toBeCloseTo(20.01, 2);
  });
});

describe("calculateVatAmount", () => {
  it("applies the default VAT percent when none is given", () => {
    expect(calculateVatAmount(1000)).toBe(1000 * (DEFAULT_VAT_PERCENT / 100));
  });

  it("applies a custom VAT percent", () => {
    expect(calculateVatAmount(1000, 10)).toBe(100);
  });

  it("returns 0 VAT on a 0 subtotal", () => {
    expect(calculateVatAmount(0)).toBe(0);
  });
});

describe("calculateGrandTotal", () => {
  it("adds subtotal and VAT", () => {
    expect(calculateGrandTotal(1000, 50)).toBe(1050);
  });

  it("rounds the combined result", () => {
    expect(calculateGrandTotal(10.005, 0.005)).toBeCloseTo(10.01, 2);
  });
});

describe("end-to-end totals for a small invoice", () => {
  it("matches manual VAT-invoice math", () => {
    const lines = [
      calculateLineTotal({ quantity: 12, unitPrice: 45 }),
      calculateLineTotal({ quantity: 5, unitPrice: 120, discountPercent: 15 }),
    ];
    const subtotal = calculateLineItemsSubtotal(lines.map((lineTotal) => ({ lineTotal })));
    expect(subtotal).toBe(1050);

    const vatAmount = calculateVatAmount(subtotal);
    expect(vatAmount).toBe(52.5);

    const grandTotal = calculateGrandTotal(subtotal, vatAmount);
    expect(grandTotal).toBe(1102.5);
  });
});
