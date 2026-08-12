import { DB_TRANSACTION_OPTIONS, prisma } from "@/lib/db";
import { normalizeManufacturerName } from "@/modules/manufacturer/domain/normalize";
import { createManufacturerSchema } from "@/modules/manufacturer/schemas/create-manufacturer";

export async function listManufacturers() {
  return prisma.manufacturer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createManufacturer(input: {
  name: string;
  createdByUserId: string;
}) {
  const values = createManufacturerSchema.parse({ name: input.name });
  const name = values.name.trim();
  const nameNormalized = normalizeManufacturerName(name);

  const existing = await prisma.manufacturer.findUnique({
    where: { nameNormalized },
  });
  if (existing) {
    if (!existing.isActive) {
      return prisma.$transaction(async (tx) => {
        const restored = await tx.manufacturer.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            name,
            createdById: input.createdByUserId,
          },
        });
        await tx.auditLog.create({
          data: {
            entityType: "Manufacturer",
            entityId: restored.id,
            action: "MANUFACTURER_RESTORED",
            actorId: input.createdByUserId,
            payload: { name: restored.name },
          },
        });
        return restored;
      }, DB_TRANSACTION_OPTIONS);
    }
    throw new Error("A manufacturer with this name already exists.");
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.manufacturer.create({
      data: {
        name,
        nameNormalized,
        createdById: input.createdByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Manufacturer",
        entityId: created.id,
        action: "MANUFACTURER_CREATED",
        actorId: input.createdByUserId,
        payload: { name: created.name },
      },
    });

    return created;
  }, DB_TRANSACTION_OPTIONS);
}

/**
 * Soft-deletes when the manufacturer has movement/variance history (no LPOs).
 * Blocks when still assigned to LPOs. Hard-deletes when unused.
 */
export async function deleteManufacturer(input: {
  manufacturerId: string;
  actorUserId: string;
}) {
  const existing = await prisma.manufacturer.findUnique({
    where: { id: input.manufacturerId },
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: {
        select: { lpos: true, movements: true, variances: true },
      },
    },
  });
  if (!existing || !existing.isActive) {
    throw new Error("Manufacturer not found.");
  }

  if (existing._count.lpos > 0) {
    throw new Error(
      "Cannot delete: manufacturer is assigned to one or more LPOs. Reassign or delete those LPOs first.",
    );
  }

  const hasHistory =
    existing._count.movements > 0 || existing._count.variances > 0;

  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.manufacturer.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          entityType: "Manufacturer",
          entityId: existing.id,
          action: "MANUFACTURER_DEACTIVATED",
          actorId: input.actorUserId,
          payload: { name: existing.name },
        },
      });
    }, DB_TRANSACTION_OPTIONS);

    return { mode: "deactivated" as const, name: existing.name };
  }

  await prisma.$transaction(async (tx) => {
    await tx.manufacturer.delete({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: {
        entityType: "Manufacturer",
        entityId: existing.id,
        action: "MANUFACTURER_DELETED",
        actorId: input.actorUserId,
        payload: { name: existing.name },
      },
    });
  }, DB_TRANSACTION_OPTIONS);

  return { mode: "deleted" as const, name: existing.name };
}
