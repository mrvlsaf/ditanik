import { FabricMovementType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { summarizeManufacturerBatchLedger } from "@/modules/fabric/domain/manufacturer-ledger";
import { roundMeters } from "@/modules/fabric/domain/meters";
import { recordUsageSchema } from "@/modules/fabric/schemas/record-usage";
import { parseCalendarDateInput } from "@/modules/lpo/domain/due-dates";

export type RecordUsageInput = {
  batchId: string;
  manufacturerId: string;
  lpoId: string;
  quantityMeters: number;
  occurredAt: string;
  note?: string;
  createdByUserId: string;
};

export async function recordUsage(input: RecordUsageInput) {
  const values = recordUsageSchema.parse({
    batchId: input.batchId,
    manufacturerId: input.manufacturerId,
    lpoId: input.lpoId,
    quantityMeters: input.quantityMeters,
    occurredAt: input.occurredAt,
    note: input.note,
  });

  const batch = await prisma.fabricBatch.findUnique({
    where: { id: values.batchId },
  });
  if (!batch) {
    throw new Error("Fabric batch not found.");
  }

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: values.manufacturerId },
  });
  if (!manufacturer) {
    throw new Error("Manufacturer not found.");
  }

  const lpo = await prisma.lpo.findUnique({ where: { id: values.lpoId } });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  const manufacturerMovements = await prisma.fabricMovement.findMany({
    where: {
      batchId: values.batchId,
      manufacturerId: values.manufacturerId,
    },
    select: { type: true, quantityMeters: true },
  });

  const ledger = summarizeManufacturerBatchLedger(
    manufacturerMovements.map((row) => ({
      type: row.type,
      quantityMeters: Number(row.quantityMeters),
    })),
  );

  const qty = roundMeters(values.quantityMeters);
  if (ledger.expectedBalance + 1e-9 < qty) {
    throw new Error(
      `Insufficient manufacturer fabric balance. Expected balance ${ledger.expectedBalance} m, usage ${qty} m.`,
    );
  }

  const occurredAt = parseCalendarDateInput(values.occurredAt);

  return prisma.$transaction(async (tx) => {
    const movement = await tx.fabricMovement.create({
      data: {
        type: FabricMovementType.USED_FOR_LPO,
        batchId: values.batchId,
        manufacturerId: values.manufacturerId,
        lpoId: values.lpoId,
        quantityMeters: -qty,
        note: values.note?.trim() || null,
        createdById: input.createdByUserId,
        occurredAt,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "FabricBatch",
        entityId: values.batchId,
        action: "FABRIC_USED_FOR_LPO",
        actorId: input.createdByUserId,
        payload: {
          movementId: movement.id,
          manufacturerId: values.manufacturerId,
          lpoId: values.lpoId,
          quantityMeters: qty,
          occurredAt: values.occurredAt,
          expectedBalanceBefore: ledger.expectedBalance,
        },
      },
    });

    return movement;
  });
}
