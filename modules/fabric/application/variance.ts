import { FabricVarianceReason } from "@prisma/client";

import { prisma } from "@/lib/db";
import { calculateVarianceDifference } from "@/modules/fabric/domain/meters";
import { createVarianceSchema } from "@/modules/fabric/schemas/variance";

export type CreateVarianceInput = {
  expectedMeters: number;
  actualMeters: number;
  reason: FabricVarianceReason | string;
  batchId?: string;
  manufacturerId?: string;
  lpoId?: string;
  note?: string;
  createdByUserId: string;
};

export async function createVariance(input: CreateVarianceInput) {
  const values = createVarianceSchema.parse({
    expectedMeters: input.expectedMeters,
    actualMeters: input.actualMeters,
    reason: input.reason,
    batchId: input.batchId,
    manufacturerId: input.manufacturerId,
    lpoId: input.lpoId,
    note: input.note,
  });

  if (values.batchId) {
    const batch = await prisma.fabricBatch.findUnique({
      where: { id: values.batchId },
      select: { id: true },
    });
    if (!batch) {
      throw new Error("Fabric batch not found.");
    }
  }

  if (values.manufacturerId) {
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: values.manufacturerId },
      select: { id: true },
    });
    if (!manufacturer) {
      throw new Error("Manufacturer not found.");
    }
  }

  if (values.lpoId) {
    const lpo = await prisma.lpo.findUnique({
      where: { id: values.lpoId },
      select: { id: true },
    });
    if (!lpo) {
      throw new Error("LPO not found.");
    }
  }

  const differenceMeters = calculateVarianceDifference(
    values.expectedMeters,
    values.actualMeters,
  );

  return prisma.$transaction(async (tx) => {
    const variance = await tx.fabricVariance.create({
      data: {
        batchId: values.batchId ?? null,
        manufacturerId: values.manufacturerId ?? null,
        lpoId: values.lpoId ?? null,
        expectedMeters: values.expectedMeters,
        actualMeters: values.actualMeters,
        differenceMeters,
        reason: values.reason,
        note: values.note?.trim() || null,
        createdById: input.createdByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "FabricVariance",
        entityId: variance.id,
        action: "FABRIC_VARIANCE_CREATED",
        actorId: input.createdByUserId,
        payload: {
          expectedMeters: values.expectedMeters,
          actualMeters: values.actualMeters,
          differenceMeters,
          reason: values.reason,
          batchId: values.batchId ?? null,
          manufacturerId: values.manufacturerId ?? null,
          lpoId: values.lpoId ?? null,
        },
      },
    });

    return variance;
  });
}
