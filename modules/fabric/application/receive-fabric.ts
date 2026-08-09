import { FabricMovementType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { generateFabricCode } from "@/modules/fabric/application/fabric-code";
import {
  receiveFabricSchema,
  type ReceiveFabricBatchValues,
} from "@/modules/fabric/schemas/receive-fabric";
import { storePdfUpload } from "@/modules/files/application/store-pdf";
import { parseCalendarDateInput } from "@/modules/lpo/domain/due-dates";

export type ReceiveFabricInput = {
  supplierName: string;
  invoiceRef: string;
  receivedDate: string;
  batches: ReadonlyArray<ReceiveFabricBatchValues>;
  invoiceFile: File;
  createdByUserId: string;
};

export async function receiveFabric(input: ReceiveFabricInput) {
  const values = receiveFabricSchema.parse({
    supplierName: input.supplierName,
    invoiceRef: input.invoiceRef,
    receivedDate: input.receivedDate,
    batches: input.batches,
  });

  if (!(input.invoiceFile instanceof File) || input.invoiceFile.size === 0) {
    throw new Error("Supplier invoice PDF is required.");
  }

  const receivedDate = parseCalendarDateInput(values.receivedDate);
  const storedFile = await storePdfUpload(input.invoiceFile, "fabric-invoices");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.fabricSupplierInvoice.create({
      data: {
        supplierName: values.supplierName,
        invoiceRef: values.invoiceRef,
        receivedDate,
        invoiceFileKey: storedFile.fileKey,
        invoiceFileName: storedFile.fileName,
        invoiceMimeType: storedFile.mimeType,
        createdById: input.createdByUserId,
      },
    });

    const createdBatches = [];

    for (const batchInput of values.batches) {
      let fabricCode: string | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = generateFabricCode();
        const existing = await tx.fabricBatch.findUnique({
          where: { fabricCode: candidate },
          select: { id: true },
        });
        if (!existing) {
          fabricCode = candidate;
          break;
        }
      }
      if (!fabricCode) {
        throw new Error("Could not allocate a unique fabric code. Try again.");
      }

      const batch = await tx.fabricBatch.create({
        data: {
          fabricCode,
          fabricType: batchInput.fabricType,
          colour: batchInput.colour,
          remarks: batchInput.remarks?.trim() || null,
          qtyReceived: batchInput.qtyReceived,
          invoiceId: invoice.id,
        },
      });

      await tx.fabricMovement.create({
        data: {
          type: FabricMovementType.RECEIVED,
          batchId: batch.id,
          quantityMeters: batchInput.qtyReceived,
          createdById: input.createdByUserId,
          occurredAt: receivedDate,
        },
      });

      createdBatches.push(batch);
    }

    await tx.auditLog.create({
      data: {
        entityType: "FabricSupplierInvoice",
        entityId: invoice.id,
        action: "FABRIC_RECEIVED",
        actorId: input.createdByUserId,
        payload: {
          supplierName: invoice.supplierName,
          invoiceRef: invoice.invoiceRef,
          receivedDate: values.receivedDate,
          batchCount: createdBatches.length,
          batchIds: createdBatches.map((batch) => batch.id),
          fabricCodes: createdBatches.map((batch) => batch.fabricCode),
        },
      },
    });

    return { invoice, batches: createdBatches };
  });
}
