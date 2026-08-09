import { FabricMovementType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getBatchStock } from "@/modules/fabric/application/get-fabric";
import { roundMeters } from "@/modules/fabric/domain/meters";
import { issueFabricSchema } from "@/modules/fabric/schemas/issue-fabric";
import { parseCalendarDateInput } from "@/modules/lpo/domain/due-dates";

export type IssueFabricInput = {
  batchId: string;
  manufacturerId: string;
  quantityMeters: number;
  occurredAt: string;
  transportRef?: string;
  lpoId?: string;
  createdByUserId: string;
};

export async function issueFabric(input: IssueFabricInput) {
  const values = issueFabricSchema.parse({
    batchId: input.batchId,
    manufacturerId: input.manufacturerId,
    quantityMeters: input.quantityMeters,
    occurredAt: input.occurredAt,
    transportRef: input.transportRef,
    lpoId: input.lpoId,
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
  if (!manufacturer || !manufacturer.isActive) {
    throw new Error("Manufacturer not found or inactive.");
  }

  if (values.lpoId) {
    const lpo = await prisma.lpo.findUnique({ where: { id: values.lpoId } });
    if (!lpo) {
      throw new Error("LPO not found.");
    }
  }

  const stock = await getBatchStock(values.batchId);
  const qty = roundMeters(values.quantityMeters);
  if (stock + 1e-9 < qty) {
    throw new Error(
      `Insufficient stock. Available ${stock} m, requested ${qty} m.`,
    );
  }

  const occurredAt = parseCalendarDateInput(values.occurredAt);

  return prisma.$transaction(async (tx) => {
    const movement = await tx.fabricMovement.create({
      data: {
        type: FabricMovementType.ISSUED,
        batchId: values.batchId,
        manufacturerId: values.manufacturerId,
        lpoId: values.lpoId ?? null,
        quantityMeters: -qty,
        transportRef: values.transportRef?.trim() || null,
        createdById: input.createdByUserId,
        occurredAt,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "FabricBatch",
        entityId: values.batchId,
        action: "FABRIC_ISSUED",
        actorId: input.createdByUserId,
        payload: {
          movementId: movement.id,
          manufacturerId: values.manufacturerId,
          lpoId: values.lpoId ?? null,
          quantityMeters: qty,
          transportRef: values.transportRef ?? null,
          occurredAt: values.occurredAt,
        },
      },
    });

    return movement;
  });
}
