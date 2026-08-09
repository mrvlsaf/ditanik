import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { storePdfUpload } from "@/modules/files/application/store-pdf";
import {
  defaultLpoDatesFromReceived,
  isReceivedDateAllowed,
  parseCalendarDateInput,
} from "@/modules/lpo/domain/due-dates";
import { initialStatusAfterCreate } from "@/modules/lpo/domain/lpo-status";
import { createLpoFormSchema } from "@/modules/lpo/schemas/create-lpo";

export type CreateLpoInput = {
  lpoNumber: string;
  nickname: string;
  clientName: string;
  receivedDate: string;
  file: File;
  createdByUserId: string;
};

export async function createLpo(input: CreateLpoInput) {
  const values = createLpoFormSchema.parse({
    lpoNumber: input.lpoNumber,
    nickname: input.nickname,
    clientName: input.clientName,
    receivedDate: input.receivedDate,
  });

  const receivedDate = parseCalendarDateInput(values.receivedDate);
  if (!isReceivedDateAllowed(receivedDate)) {
    throw new Error("Received date cannot be in the future.");
  }

  const existing = await prisma.lpo.findUnique({
    where: { lpoNumber: values.lpoNumber },
  });
  if (existing) {
    throw new Error("An LPO with this number already exists.");
  }

  const storedFile = await storePdfUpload(input.file, "lpo-originals");
  const dates = defaultLpoDatesFromReceived(receivedDate);
  const status = initialStatusAfterCreate();

  return prisma.$transaction(async (tx) => {
    const created = await tx.lpo.create({
      data: {
        lpoNumber: values.lpoNumber,
        nickname: values.nickname,
        clientName: values.clientName,
        // Stored for schema compatibility; business dates use receivedDate only.
        lpoDate: receivedDate,
        receivedDate,
        originalFileKey: storedFile.fileKey,
        originalFileName: storedFile.fileName,
        originalMimeType: storedFile.mimeType,
        status: LpoStatus.LPO_RECEIVED,
        manufacturerAssignmentAt: dates.manufacturerAssignmentAt,
        productionDeadlineAt: dates.productionDeadlineAt,
        clientDeliveryAt: dates.clientDeliveryAt,
        createdById: input.createdByUserId,
      },
    });

    const underReview = await tx.lpo.update({
      where: { id: created.id },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: created.id,
        action: "LPO_CREATED",
        actorId: input.createdByUserId,
        payload: {
          lpoNumber: created.lpoNumber,
          nickname: created.nickname,
          statusAfterCreate: status,
          manufacturerAssignmentAt: dates.manufacturerAssignmentAt.toISOString(),
          productionDeadlineAt: dates.productionDeadlineAt.toISOString(),
          clientDeliveryAt: dates.clientDeliveryAt.toISOString(),
        },
      },
    });

    return underReview;
  });
}
