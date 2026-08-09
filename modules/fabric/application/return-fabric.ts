import { FabricMovementType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { summarizeManufacturerBatchLedger } from "@/modules/fabric/domain/manufacturer-ledger";
import { roundMeters } from "@/modules/fabric/domain/meters";
import { returnFabricSchema } from "@/modules/fabric/schemas/return-fabric";
import { parseCalendarDateInput } from "@/modules/lpo/domain/due-dates";

export type ReturnFabricInput = {
  batchId: string;
  manufacturerId: string;
  quantityMeters: number;
  occurredAt: string;
  note?: string;
  createdByUserId: string;
};

export async function returnFabric(input: ReturnFabricInput) {
  const values = returnFabricSchema.parse({
    batchId: input.batchId,
    manufacturerId: input.manufacturerId,
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
      `Cannot return ${qty} m; manufacturer expected balance is ${ledger.expectedBalance} m.`,
    );
  }

  const occurredAt = parseCalendarDateInput(values.occurredAt);

  return prisma.$transaction(async (tx) => {
    const movement = await tx.fabricMovement.create({
      data: {
        type: FabricMovementType.RETURNED,
        batchId: values.batchId,
        manufacturerId: values.manufacturerId,
        quantityMeters: qty,
        note: values.note?.trim() || null,
        createdById: input.createdByUserId,
        occurredAt,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "FabricBatch",
        entityId: values.batchId,
        action: "FABRIC_RETURNED",
        actorId: input.createdByUserId,
        payload: {
          movementId: movement.id,
          manufacturerId: values.manufacturerId,
          quantityMeters: qty,
          occurredAt: values.occurredAt,
          note: values.note ?? null,
        },
      },
    });

    return movement;
  });
}
