import { prisma } from "@/lib/db";
import { storePdfUpload } from "@/modules/files/application/store-pdf";
import {
  assertLpoTransition,
  nextStatusForTransition,
} from "@/modules/lpo/domain/lpo-status";

export type AttachReviewPdfInput = {
  lpoId: string;
  file: File;
  actorUserId: string;
};

/** Stores review PDF while Pending; does not change status. */
export async function attachReviewPdf(input: AttachReviewPdfInput) {
  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: {
      id: true,
      status: true,
      originalFileKey: true,
    },
  });
  if (!lpo) {
    throw new Error("LPO not found.");
  }
  if (lpo.status !== "PENDING") {
    throw new Error("Review PDF can only be uploaded while status is Pending.");
  }

  const stored = await storePdfUpload(input.file, "lpo-reviews");
  if (stored.fileKey === lpo.originalFileKey) {
    throw new Error("Review PDF must be a different file from the original LPO.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: input.lpoId },
      data: {
        reviewFileKey: stored.fileKey,
        reviewFileName: stored.fileName,
        reviewMimeType: stored.mimeType,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_REVIEW_PDF_ATTACHED",
        actorId: input.actorUserId,
        payload: {
          reviewFileKey: stored.fileKey,
          reviewFileName: stored.fileName,
        },
      },
    });

    return updated;
  });
}

export type MarkLpoTransitionInput = {
  lpoId: string;
  actorUserId: string;
};

export async function markLpoAsReviewed(input: MarkLpoTransitionInput) {
  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: {
      id: true,
      status: true,
      reviewFileKey: true,
    },
  });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  assertLpoTransition(
    { status: lpo.status, reviewFileKey: lpo.reviewFileKey },
    "mark_reviewed",
  );

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: input.lpoId },
      data: {
        status: nextStatusForTransition("mark_reviewed"),
        reviewedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_MARKED_REVIEWED",
        actorId: input.actorUserId,
        payload: { reviewedAt: now.toISOString() },
      },
    });

    return updated;
  });
}

export async function markLpoAsDelivered(input: MarkLpoTransitionInput) {
  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: {
      id: true,
      status: true,
      reviewFileKey: true,
    },
  });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  assertLpoTransition(
    { status: lpo.status, reviewFileKey: lpo.reviewFileKey },
    "mark_delivered",
  );

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: input.lpoId },
      data: {
        status: nextStatusForTransition("mark_delivered"),
        deliveredAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_MARKED_DELIVERED",
        actorId: input.actorUserId,
        payload: { deliveredAt: now.toISOString() },
      },
    });

    return updated;
  });
}
