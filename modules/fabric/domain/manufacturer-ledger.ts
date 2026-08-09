import { FabricMovementType } from "@prisma/client";

import { roundMeters } from "@/modules/fabric/domain/meters";

export type ManufacturerBatchLedgerSummary = {
  sent: number;
  used: number;
  returned: number;
  expectedBalance: number;
};

/** Aggregate ISSUED / USED_FOR_LPO / RETURNED meters for one batch at a manufacturer. */
export function summarizeManufacturerBatchLedger(
  movements: ReadonlyArray<{
    type: FabricMovementType;
    quantityMeters: number;
  }>,
): ManufacturerBatchLedgerSummary {
  let sent = 0;
  let used = 0;
  let returned = 0;

  for (const row of movements) {
    const qty = Math.abs(row.quantityMeters);
    if (row.type === FabricMovementType.ISSUED) {
      sent = roundMeters(sent + qty);
    } else if (row.type === FabricMovementType.USED_FOR_LPO) {
      used = roundMeters(used + qty);
    } else if (row.type === FabricMovementType.RETURNED) {
      returned = roundMeters(returned + qty);
    }
  }

  return {
    sent,
    used,
    returned,
    expectedBalance: roundMeters(sent - used - returned),
  };
}
