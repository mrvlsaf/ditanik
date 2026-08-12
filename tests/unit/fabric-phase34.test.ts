import { FabricMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { generateFabricCode } from "@/modules/fabric/application/fabric-code";
import {
  groupManufacturerMovementsByLpo,
  summarizeManufacturerBatchLedger,
} from "@/modules/fabric/domain/manufacturer-ledger";

describe("generateFabricCode", () => {
  it("returns FAB- plus 6 alphanumeric characters", () => {
    const code = generateFabricCode();
    expect(code).toMatch(/^FAB-[A-Z2-9]{6}$/);
  });
});

describe("summarizeManufacturerBatchLedger", () => {
  it("computes sent, used, returned, and expected balance", () => {
    const summary = summarizeManufacturerBatchLedger([
      { type: FabricMovementType.ISSUED, quantityMeters: -50 },
      { type: FabricMovementType.ISSUED, quantityMeters: -10 },
      { type: FabricMovementType.USED_FOR_LPO, quantityMeters: -30 },
      { type: FabricMovementType.RETURNED, quantityMeters: 5 },
    ]);

    expect(summary).toEqual({
      sent: 60,
      used: 30,
      returned: 5,
      expectedBalance: 25,
    });
  });
});

describe("groupManufacturerMovementsByLpo", () => {
  it("keeps same batch separate per LPO and standalone", () => {
    const buckets = groupManufacturerMovementsByLpo([
      {
        batchId: "batch-1",
        lpoId: "lpo-a",
        type: FabricMovementType.ISSUED,
        quantityMeters: -10,
        fabricCode: "FAB-AAAAAA",
        fabricType: "Cotton",
        colour: "White",
      },
      {
        batchId: "batch-1",
        lpoId: "lpo-b",
        type: FabricMovementType.ISSUED,
        quantityMeters: -20,
        fabricCode: "FAB-AAAAAA",
        fabricType: "Cotton",
        colour: "White",
      },
      {
        batchId: "batch-1",
        lpoId: null,
        type: FabricMovementType.ISSUED,
        quantityMeters: -5,
        fabricCode: "FAB-AAAAAA",
        fabricType: "Cotton",
        colour: "White",
      },
    ]);

    expect(buckets).toHaveLength(3);

    const byLpo = Object.fromEntries(
      buckets.map((b) => [b.lpoId ?? "standalone", b.expectedBalance]),
    );
    expect(byLpo["lpo-a"]).toBe(10);
    expect(byLpo["lpo-b"]).toBe(20);
    expect(byLpo.standalone).toBe(5);
  });
});
