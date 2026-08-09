import { prisma } from "@/lib/db";
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
  });
}
