import { FabricMovementType } from "@prisma/client";

import { DB_TRANSACTION_OPTIONS, prisma } from "@/lib/db";

export async function deleteFabricInvoice(input: {
  invoiceId: string;
  actorUserId: string;
}) {
  const invoice = await prisma.fabricSupplierInvoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      supplierName: true,
      invoiceRef: true,
      isActive: true,
      batches: { select: { id: true, fabricCode: true } },
    },
  });
  if (!invoice || !invoice.isActive) {
    throw new Error("Invoice not found.");
  }

  const batchIds = invoice.batches.map((batch) => batch.id);

  const [usageMovementCount, varianceCount] =
    batchIds.length > 0
      ? await Promise.all([
          prisma.fabricMovement.count({
            where: {
              batchId: { in: batchIds },
              type: { not: FabricMovementType.RECEIVED },
            },
          }),
          prisma.fabricVariance.count({
            where: { batchId: { in: batchIds } },
          }),
        ])
      : [0, 0];
  const hasHistory = usageMovementCount > 0 || varianceCount > 0;

  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.fabricBatch.updateMany({
        where: { id: { in: batchIds } },
        data: { isActive: false },
      });
      await tx.fabricSupplierInvoice.update({
        where: { id: invoice.id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          entityType: "FabricSupplierInvoice",
          entityId: invoice.id,
          action: "FABRIC_INVOICE_DEACTIVATED",
          actorId: input.actorUserId,
          payload: {
            supplierName: invoice.supplierName,
            invoiceRef: invoice.invoiceRef,
            fabricCodes: invoice.batches.map((batch) => batch.fabricCode),
          },
        },
      });
    }, DB_TRANSACTION_OPTIONS);

    return { mode: "deactivated" as const, invoice };
  }

  await prisma.$transaction(async (tx) => {
    if (batchIds.length > 0) {
      await tx.fabricMovement.deleteMany({
        where: { batchId: { in: batchIds } },
      });
    }
    await tx.fabricSupplierInvoice.delete({ where: { id: invoice.id } });
    await tx.auditLog.create({
      data: {
        entityType: "FabricSupplierInvoice",
        entityId: invoice.id,
        action: "FABRIC_INVOICE_DELETED",
        actorId: input.actorUserId,
        payload: {
          supplierName: invoice.supplierName,
          invoiceRef: invoice.invoiceRef,
          fabricCodes: invoice.batches.map((batch) => batch.fabricCode),
        },
      },
    });
  }, DB_TRANSACTION_OPTIONS);

  return { mode: "deleted" as const, invoice };
}

export async function deleteFabricBatch(input: {
  batchId: string;
  actorUserId: string;
}) {
  const batch = await prisma.fabricBatch.findUnique({
    where: { id: input.batchId },
    select: {
      id: true,
      fabricCode: true,
      invoiceId: true,
      isActive: true,
      invoice: {
        select: {
          id: true,
          _count: { select: { batches: true } },
        },
      },
    },
  });
  if (!batch || !batch.isActive) {
    throw new Error("Fabric batch not found.");
  }

  const [usageMovementCount, varianceCount] = await Promise.all([
    prisma.fabricMovement.count({
      where: {
        batchId: batch.id,
        type: { not: FabricMovementType.RECEIVED },
      },
    }),
    prisma.fabricVariance.count({ where: { batchId: batch.id } }),
  ]);
  const hasHistory = usageMovementCount > 0 || varianceCount > 0;

  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.fabricBatch.update({
        where: { id: batch.id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          entityType: "FabricBatch",
          entityId: batch.id,
          action: "FABRIC_BATCH_DEACTIVATED",
          actorId: input.actorUserId,
          payload: {
            fabricCode: batch.fabricCode,
            invoiceId: batch.invoiceId,
          },
        },
      });
    }, DB_TRANSACTION_OPTIONS);

    return { mode: "deactivated" as const, batch };
  }

  await prisma.$transaction(async (tx) => {
    await tx.fabricMovement.deleteMany({ where: { batchId: batch.id } });
    await tx.fabricBatch.delete({ where: { id: batch.id } });

    // Remove empty invoice shell if this was the last batch.
    if (batch.invoice._count.batches <= 1) {
      await tx.fabricSupplierInvoice.delete({
        where: { id: batch.invoiceId },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "FabricBatch",
        entityId: batch.id,
        action: "FABRIC_BATCH_DELETED",
        actorId: input.actorUserId,
        payload: {
          fabricCode: batch.fabricCode,
          invoiceId: batch.invoiceId,
        },
      },
    });
  }, DB_TRANSACTION_OPTIONS);

  return { mode: "deleted" as const, batch };
}