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
import {
  formatUrgentLpoNumber,
  looksLikeUrgentLpoNumber,
} from "@/modules/lpo/domain/urgent-lpo";
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
  /** The customer's PDF. Required for a normal LPO, optional for an urgent one. */
  file?: File | UploadedFileRef | null;
  /** Urgent LPO: the number is generated and no dates or reminders are set. */
  isUrgent?: boolean;
  createdByUserId: string;
};

export async function createLpo(input: CreateLpoInput) {
  const isUrgent = input.isUrgent === true;
  const values = createLpoFormSchema.parse({
    // An urgent LPO's number is generated below, so any typed one is ignored.
    lpoNumber: isUrgent ? "URGENT" : input.lpoNumber,
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

  if (!isUrgent) {
    if (looksLikeUrgentLpoNumber(values.lpoNumber)) {
      throw new Error(
        "Numbers like URGENT_1 are reserved for urgent LPOs. Use the Urgent LPO option instead.",
      );
    }
    if (!input.file) {
      throw new Error("LPO document PDF is required.");
    }
    const existing = await prisma.lpo.findUnique({
      where: { lpoNumber: values.lpoNumber },
    });
    if (existing) {
      throw new Error("An LPO with this number already exists.");
    }
  }

  const storedFile = input.file
    ? await storePdfUpload(input.file, "lpo-originals")
    : null;
  // Urgent LPOs have no planned dates, so nothing can go overdue or send reminders.
  const dates = isUrgent ? null : defaultLpoDatesFromReceived(receivedDate);
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
    let lpoNumber = values.lpoNumber;
    if (isUrgent) {
      // One atomic increment, so two people creating at once never share a number.
      const counter = await tx.urgentLpoCounter.upsert({
        where: { id: 1 },
        create: { id: 1, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      lpoNumber = formatUrgentLpoNumber(counter.lastValue);
    }

    const created = await tx.lpo.create({
      data: {
        lpoNumber,
        isUrgent,
        nickname: values.nickname,
        clientName: values.clientName,
        // Stored for schema compatibility; business dates use receivedDate only.
        lpoDate: receivedDate,
        receivedDate,
        originalFileKey: storedFile?.fileKey ?? null,
        originalFileName: storedFile?.fileName ?? null,
        originalMimeType: storedFile?.mimeType ?? null,
        status: LpoStatus.LPO_RECEIVED,
        manufacturerAssignmentAt: dates?.manufacturerAssignmentAt ?? null,
        productionDeadlineAt: dates?.productionDeadlineAt ?? null,
        clientDeliveryAt: dates?.clientDeliveryAt ?? null,
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
          isUrgent,
          manufacturerAssignmentAt: dates?.manufacturerAssignmentAt.toISOString() ?? null,
          productionDeadlineAt: dates?.productionDeadlineAt.toISOString() ?? null,
          clientDeliveryAt: dates?.clientDeliveryAt.toISOString() ?? null,
          siteCode: values.siteCode,
          lineItemCount: lineItemsWithTotals.length,
        },
      },
    });

    return underReview;
  });
}
