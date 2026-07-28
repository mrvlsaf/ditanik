import { fromZonedTime } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import { prisma } from "@/lib/db";
import {
  calculateDueAtFromReceivedDate,
  isReceivedDateAllowed,
} from "@/modules/lpo/domain/due-dates";
import { saveOriginalLpoFileStub } from "@/modules/lpo/infrastructure/save-original-file-stub";
import { createLpoFormSchema } from "@/modules/lpo/schemas/create-lpo";

function parseReceivedDateInput(yyyyMmDd: string): Date {
  return fromZonedTime(`${yyyyMmDd}T12:00:00.000`, BUSINESS_TIMEZONE);
}

export type CreateLpoInput = {
  lpoNumber: string;
  receivedDate: string;
  reviewDueDays: number;
  deliveryDueDays: number;
  file: File;
  createdByUserId: string;
};

export async function createLpo(input: CreateLpoInput) {
  const values = createLpoFormSchema.parse({
    lpoNumber: input.lpoNumber,
    receivedDate: input.receivedDate,
    reviewDueDays: input.reviewDueDays,
    deliveryDueDays: input.deliveryDueDays,
  });

  if (input.file.size === 0) {
    throw new Error("LPO file is required.");
  }

  const receivedDate = parseReceivedDateInput(values.receivedDate);
  if (!isReceivedDateAllowed(receivedDate)) {
    throw new Error("Received date cannot be in the future.");
  }

  const existing = await prisma.lpo.findUnique({
    where: { lpoNumber: values.lpoNumber },
  });
  if (existing) {
    throw new Error("An LPO with this number already exists.");
  }

  const storedFile = await saveOriginalLpoFileStub(input.file);
  const reviewDueAt = calculateDueAtFromReceivedDate(
    receivedDate,
    values.reviewDueDays,
  );
  const deliveryDueAt = calculateDueAtFromReceivedDate(
    receivedDate,
    values.deliveryDueDays,
  );

  return prisma.$transaction(async (tx) => {
    const created = await tx.lpo.create({
      data: {
        lpoNumber: values.lpoNumber,
        receivedDate,
        originalFileKey: storedFile.fileKey,
        originalFileName: storedFile.fileName,
        originalMimeType: storedFile.mimeType,
        reviewDueAt,
        deliveryDueAt,
        status: "PENDING",
        createdById: input.createdByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: created.id,
        action: "LPO_CREATED",
        actorId: input.createdByUserId,
        payload: {
          lpoNumber: created.lpoNumber,
          reviewDueAt: created.reviewDueAt.toISOString(),
          deliveryDueAt: created.deliveryDueAt.toISOString(),
        },
      },
    });

    return created;
  });
}
