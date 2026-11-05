import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  storePdfUpload,
  type UploadedFileRef,
} from "@/modules/files/application/store-pdf";
import {
  defaultLpoDatesFromReceived,
  isReceivedDateAllowed,
  parseCalendarDateInput,
} from "@/modules/lpo/domain/due-dates";
import { calculateLineTotal } from "@/modules/lpo/domain/line-items";
import { initialStatusAfterCreate } from "@/modules/lpo/domain/lpo-status";
import { createLpoFormSchema } from "@/modules/lpo/schemas/create-lpo";
import type { LpoLineItemValues } from "@/modules/lpo/schemas/line-items";

export type CreateLpoInput = {
  lpoNumber: string;
  nickname: string;
  clientName: string;
  receivedDate: string;
  clientSubEntityName?: string;
  clientTrn?: string;
  invoiceAddress: string;
  deliveryAddress?: string;
  siteCode: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  currency?: string;
  lineItems: LpoLineItemValues[];
  file: File | UploadedFileRef;
  createdByUserId: string;
};

export async function createLpo(input: CreateLpoInput) {
  const values = createLpoFormSchema.parse({
    lpoNumber: input.lpoNumber,
    nickname: input.nickname,
    clientName: input.clientName,
    receivedDate: input.receivedDate,
    clientSubEntityName: input.clientSubEntityName,
    clientTrn: input.clientTrn,
    invoiceAddress: input.invoiceAddress,
    deliveryAddress: input.deliveryAddress,
    siteCode: input.siteCode,
    paymentTerms: input.paymentTerms,
    deliveryTerms: input.deliveryTerms,
    currency: input.currency,
    lineItems: input.lineItems,
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

  // Compute line totals up front so a bad line fails before any writes happen.
  const lineItemsWithTotals = values.lineItems.map((line, index) => ({
    position: index + 1,
    category: line.category?.trim() || null,
    description: line.description,
    articleNo: line.articleNo?.trim() || null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountPercent: line.discountPercent ?? 0,
    lineTotal: calculateLineTotal(line),
  }));

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
        clientSubEntityName: values.clientSubEntityName?.trim() || null,
        clientTrn: values.clientTrn?.trim() || null,
        invoiceAddress: values.invoiceAddress,
        deliveryAddress: values.deliveryAddress?.trim() || null,
        siteCode: values.siteCode,
        paymentTerms: values.paymentTerms?.trim() || null,
        deliveryTerms: values.deliveryTerms?.trim() || null,
        currency: values.currency,
        lineItems: {
          create: lineItemsWithTotals,
        },
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
          siteCode: values.siteCode,
          lineItemCount: lineItemsWithTotals.length,
        },
      },
    });

    return underReview;
  });
}
