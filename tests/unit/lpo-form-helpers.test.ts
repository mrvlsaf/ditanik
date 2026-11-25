import { describe, expect, it } from "vitest";

import {
  DEFAULT_ASSIGNMENT_DAYS,
  DEFAULT_CLIENT_DELIVERY_DAYS,
  DEFAULT_PRODUCTION_DEADLINE_DAYS,
  previewDueDates,
} from "@/modules/lpo/domain/due-date-defaults";
import {
  EMPTY_LINE_ITEM_ROW,
  lineItemRowsToJson,
  summariseLineItemRows,
  tryLineTotal,
  type LpoLineItemRow,
} from "@/modules/lpo/domain/line-item-rows";

function row(overrides: Partial<LpoLineItemRow> = {}): LpoLineItemRow {
  return {
    ...EMPTY_LINE_ITEM_ROW,
    description: "Chef coat",
    quantity: "40",
    unitPrice: "85",
    ...overrides,
  };
}

describe("previewDueDates", () => {
  it("adds the default offsets to the received date", () => {
    expect(DEFAULT_ASSIGNMENT_DAYS).toBe(2);
    expect(DEFAULT_PRODUCTION_DEADLINE_DAYS).toBe(12);
    expect(DEFAULT_CLIENT_DELIVERY_DAYS).toBe(15);
    expect(previewDueDates("2026-11-02")).toEqual({
      assignment: "4 Nov 2026",
      productionDeadline: "14 Nov 2026",
      clientDelivery: "17 Nov 2026",
    });
  });

  it("crosses month and year ends", () => {
    expect(previewDueDates("2026-12-25")?.clientDelivery).toBe("9 Jan 2027");
  });

  it("returns null until the received date is a real date", () => {
    expect(previewDueDates("")).toBeNull();
    expect(previewDueDates("2026-1-2")).toBeNull();
    expect(previewDueDates("not a date")).toBeNull();
  });
});

describe("tryLineTotal", () => {
  it("works out quantity times price less any discount", () => {
    expect(tryLineTotal(row())).toBe(3400);
    expect(tryLineTotal(row({ discountPercent: "10" }))).toBe(3060);
  });

  it("is null while the row is incomplete or invalid", () => {
    expect(tryLineTotal(EMPTY_LINE_ITEM_ROW)).toBeNull();
    expect(tryLineTotal(row({ quantity: "2.5" }))).toBeNull();
    expect(tryLineTotal(row({ quantity: "0" }))).toBeNull();
    expect(tryLineTotal(row({ unitPrice: "-1" }))).toBeNull();
    expect(tryLineTotal(row({ discountPercent: "120" }))).toBeNull();
  });
});

describe("summariseLineItemRows", () => {
  it("adds up valid rows with 5% VAT and leaves invalid rows out", () => {
    const summary = summariseLineItemRows([
      row(),
      row({ quantity: "50", unitPrice: "38" }),
      row({ quantity: "" }),
    ]);
    expect(summary.rowTotals).toEqual([3400, 1900, null]);
    expect(summary.subtotal).toBe(5300);
    expect(summary.vatAmount).toBe(265);
    expect(summary.grandTotal).toBe(5565);
    expect(summary.allRowsValid).toBe(false);
  });

  it("reports every row valid when all are complete", () => {
    expect(summariseLineItemRows([row()]).allRowsValid).toBe(true);
  });
});

describe("lineItemRowsToJson", () => {
  it("sends numbers, and leaves out blank optional fields", () => {
    const json = JSON.parse(lineItemRowsToJson([row({ articleNo: "CJ-100" })]));
    expect(json).toEqual([
      {
        description: "Chef coat",
        articleNo: "CJ-100",
        quantity: 40,
        unitPrice: 85,
      },
    ]);
  });
});
