import { FabricMovementType, Prisma } from "@prisma/client";

import { DB_TRANSACTION_OPTIONS, prisma } from "@/lib/db";
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

/** Allocate codes outside the interactive transaction to keep Neon txs short. */
async function resolveFabricCodes(count: number): Promise<string[]> {
  for (let round = 0; round < 5; round += 1) {
    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < count) {
      const candidate = generateFabricCode();
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      codes.push(candidate);
    }

    const existing = await prisma.fabricBatch.findMany({
      where: { fabricCode: { in: codes } },
      select: { fabricCode: true },
    });
    if (existing.length === 0) {
      return codes;
    }
  }
  throw new Error("Could not allocate unique fabric codes. Try again.");
}

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
  const fabricCodes = await resolveFabricCodes(values.batches.length);

  try {
    return await prisma.$transaction(async (tx) => {
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

      for (let i = 0; i < values.batches.length; i += 1) {
        const batchInput = values.batches[i]!;
        const fabricCode = fabricCodes[i]!;

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
    }, DB_TRANSACTION_OPTIONS);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "A fabric code collided. Please submit Receive fabric again.",
      );
    }
    if (
      error instanceof Error &&
      (error.message.includes("Transaction not found") ||
        error.message.includes("Transaction API error"))
    ) {
      throw new Error(
        "Database connection dropped during save (common with a sleeping Neon DB). Wait a moment and try Receive fabric again.",
      );
    }
    throw error;
  }
}
