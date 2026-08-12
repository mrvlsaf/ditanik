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

export type ManufacturerLedgerMovement = {
  batchId: string;
  lpoId: string | null;
  type: FabricMovementType;
  quantityMeters: number;
  fabricCode: string;
  fabricType: string;
  colour: string;
};

export type ManufacturerLedgerBucket = {
  batchId: string;
  lpoId: string | null;
  fabricCode: string;
  fabricType: string;
  colour: string;
  sent: number;
  used: number;
  returned: number;
  expectedBalance: number;
};

/**
 * Group manufacturer movements into (batch, lpoId|null) buckets so LPO A and
 * LPO B (and no-LPO) fabric stay separate on the ledger.
 */
export function groupManufacturerMovementsByLpo(
  movements: ReadonlyArray<ManufacturerLedgerMovement>,
): ManufacturerLedgerBucket[] {
  const buckets = new Map<
    string,
    {
      batchId: string;
      lpoId: string | null;
      fabricCode: string;
      fabricType: string;
      colour: string;
      rows: Array<{ type: FabricMovementType; quantityMeters: number }>;
    }
  >();

  for (const row of movements) {
    const key = `${row.batchId}::${row.lpoId ?? ""}`;
    const existing = buckets.get(key);
    const movement = { type: row.type, quantityMeters: row.quantityMeters };
    if (existing) {
      existing.rows.push(movement);
    } else {
      buckets.set(key, {
        batchId: row.batchId,
        lpoId: row.lpoId,
        fabricCode: row.fabricCode,
        fabricType: row.fabricType,
        colour: row.colour,
        rows: [movement],
      });
    }
  }

  return [...buckets.values()].map((bucket) => {
    const summary = summarizeManufacturerBatchLedger(bucket.rows);
    return {
      batchId: bucket.batchId,
      lpoId: bucket.lpoId,
      fabricCode: bucket.fabricCode,
      fabricType: bucket.fabricType,
      colour: bucket.colour,
      ...summary,
    };
  });
}
