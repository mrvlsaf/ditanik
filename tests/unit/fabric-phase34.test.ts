import { FabricMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { generateFabricCode } from "@/modules/fabric/application/fabric-code";
import { summarizeManufacturerBatchLedger } from "@/modules/fabric/domain/manufacturer-ledger";

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
