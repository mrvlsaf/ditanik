import { prisma } from "@/lib/db";
import { calculateExpectedMeters } from "@/modules/fabric/domain/meters";
import { addLpoFabricRequirementSchema } from "@/modules/fabric/schemas/lpo-fabric-requirement";

export type AddLpoFabricRequirementInput = {
  lpoId: string;
  consumptionRateId?: string;
  garmentName?: string;
  metersPerUnit?: number;
  quantity: number;
  actorUserId: string;
};

export async function addRequirement(input: AddLpoFabricRequirementInput) {
  const values = addLpoFabricRequirementSchema.parse({
    lpoId: input.lpoId,
    consumptionRateId: input.consumptionRateId,
    garmentName: input.garmentName,
    metersPerUnit: input.metersPerUnit,
    quantity: input.quantity,
  });

  const lpo = await prisma.lpo.findUnique({ where: { id: values.lpoId } });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  let garmentName = values.garmentName?.trim() ?? "";
  let metersPerUnit = values.metersPerUnit;
  let consumptionRateId: string | null = values.consumptionRateId ?? null;

  if (values.consumptionRateId) {
    const rate = await prisma.garmentConsumptionRate.findUnique({
      where: { id: values.consumptionRateId },
    });
    if (!rate || !rate.isActive) {
      throw new Error("Consumption rate not found or inactive.");
    }
    garmentName = rate.garmentName;
    metersPerUnit = Number(rate.metersPerUnit);
    consumptionRateId = rate.id;
  }

  if (!garmentName || typeof metersPerUnit !== "number") {
    throw new Error("Garment name and meters per unit are required.");
  }

  const expectedMeters = calculateExpectedMeters(
    values.quantity,
    metersPerUnit,
  );

  return prisma.$transaction(async (tx) => {
    const requirement = await tx.lpoFabricRequirement.create({
      data: {
        lpoId: values.lpoId,
        garmentName,
        quantity: values.quantity,
        metersPerUnit,
        expectedMeters,
        consumptionRateId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: values.lpoId,
        action: "LPO_FABRIC_REQUIREMENT_ADDED",
        actorId: input.actorUserId,
        payload: {
          requirementId: requirement.id,
          garmentName,
          quantity: values.quantity,
          metersPerUnit,
          expectedMeters,
          consumptionRateId,
        },
      },
    });

    return requirement;
  });
}

export async function listForLpo(lpoId: string) {
  const rows = await prisma.lpoFabricRequirement.findMany({
    where: { lpoId },
    orderBy: { createdAt: "asc" },
    include: {
      consumptionRate: {
        select: { id: true, garmentName: true, isActive: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    lpoId: row.lpoId,
    garmentName: row.garmentName,
    quantity: row.quantity,
    metersPerUnit: Number(row.metersPerUnit),
    expectedMeters: Number(row.expectedMeters),
    consumptionRateId: row.consumptionRateId,
    consumptionRate: row.consumptionRate,
    createdAt: row.createdAt,
  }));
}

export async function deleteRequirement(
  requirementId: string,
  actorUserId: string,
) {
  const existing = await prisma.lpoFabricRequirement.findUnique({
    where: { id: requirementId },
  });
  if (!existing) {
    throw new Error("Fabric requirement not found.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.lpoFabricRequirement.delete({ where: { id: requirementId } });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: existing.lpoId,
        action: "LPO_FABRIC_REQUIREMENT_DELETED",
        actorId: actorUserId,
        payload: {
          requirementId,
          garmentName: existing.garmentName,
          quantity: existing.quantity,
          expectedMeters: Number(existing.expectedMeters),
        },
      },
    });
  });
}
