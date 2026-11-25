import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  storePdfUpload,
  type UploadedFileRef,
} from "@/modules/files/application/store-pdf";
import { assertCanAssignManufacturer } from "@/modules/lpo/domain/lpo-status";
import { assignManufacturerSchema } from "@/modules/lpo/schemas/assign-manufacturer";
import { normalizeManufacturerName } from "@/modules/manufacturer/domain/normalize";

export type AssignManufacturerInput = {
  lpoId: string;
  manufacturerId?: string;
  newManufacturerName?: string;
  /** Required for a normal LPO, optional for an urgent one. */
  productionFile?: File | UploadedFileRef | null;
  actorUserId: string;
};

export async function assignManufacturerToLpo(input: AssignManufacturerInput) {
  const values = assignManufacturerSchema.parse({
    manufacturerId: input.manufacturerId,
    newManufacturerName: input.newManufacturerName,
  });

  const lpo = await prisma.lpo.findUnique({ where: { id: input.lpoId } });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  assertCanAssignManufacturer({
    status: lpo.status,
    productionFileKey: lpo.productionFileKey,
    manufacturerId: lpo.manufacturerId,
    isUrgent: lpo.isUrgent,
  });

  if (lpo.productionFileKey) {
    throw new Error("Production file is already attached.");
  }

  if (!input.productionFile && !lpo.isUrgent) {
    throw new Error("Production file PDF is required.");
  }

  const stored = input.productionFile
    ? await storePdfUpload(input.productionFile, "lpo-production")
    : null;

  return prisma.$transaction(async (tx) => {
    let manufacturerId = values.manufacturerId;

    if (values.newManufacturerName) {
      const name = values.newManufacturerName.trim();
      const nameNormalized = normalizeManufacturerName(name);
      const existing = await tx.manufacturer.findUnique({
        where: { nameNormalized },
      });
      if (existing) {
        manufacturerId = existing.id;
      } else {
        const created = await tx.manufacturer.create({
          data: {
            name,
            nameNormalized,
            createdById: input.actorUserId,
          },
        });
        manufacturerId = created.id;
      }
    }

    if (!manufacturerId) {
      throw new Error("Manufacturer is required.");
    }

    const manufacturer = await tx.manufacturer.findUnique({
      where: { id: manufacturerId },
    });
    if (!manufacturer || !manufacturer.isActive) {
      throw new Error("Manufacturer not found or inactive.");
    }

    const updated = await tx.lpo.update({
      where: { id: lpo.id },
      data: {
        manufacturerId,
        productionFileKey: stored?.fileKey ?? null,
        productionFileName: stored?.fileName ?? null,
        productionMimeType: stored?.mimeType ?? null,
        status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: lpo.id,
        action: "LPO_ASSIGNED_MANUFACTURER",
        actorId: input.actorUserId,
        payload: {
          manufacturerId,
          manufacturerName: manufacturer.name,
          productionFileKey: stored?.fileKey ?? null,
        },
      },
    });

    return updated;
  });
}
