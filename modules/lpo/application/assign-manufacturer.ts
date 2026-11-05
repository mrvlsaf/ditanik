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
  productionFile: File | UploadedFileRef;
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
  });

  if (lpo.productionFileKey) {
    throw new Error("Production file is already attached.");
  }

  const stored = await storePdfUpload(input.productionFile, "lpo-production");

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
        productionFileKey: stored.fileKey,
        productionFileName: stored.fileName,
        productionMimeType: stored.mimeType,
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
          productionFileKey: stored.fileKey,
        },
      },
    });

    return updated;
  });
}
