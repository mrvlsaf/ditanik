import { prisma } from "@/lib/db";
import { calculateStockFromMovements } from "@/modules/fabric/domain/meters";

export async function getBatchStock(batchId: string): Promise<number> {
  const movements = await prisma.fabricMovement.findMany({
    where: { batchId },
    select: { quantityMeters: true },
  });

  return calculateStockFromMovements(
    movements.map((row) => ({ quantityMeters: Number(row.quantityMeters) })),
  );
}

export async function listBatchesWithStock() {
  const batches = await prisma.fabricBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      invoice: {
        select: {
          id: true,
          supplierName: true,
          invoiceRef: true,
          receivedDate: true,
        },
      },
      movements: {
        select: { quantityMeters: true },
      },
    },
  });

  return batches.map((batch) => {
    const stockMeters = calculateStockFromMovements(
      batch.movements.map((row) => ({
        quantityMeters: Number(row.quantityMeters),
      })),
    );

    return {
      id: batch.id,
      fabricCode: batch.fabricCode,
      fabricType: batch.fabricType,
      colour: batch.colour,
      remarks: batch.remarks,
      qtyReceived: Number(batch.qtyReceived),
      stockMeters,
      invoice: batch.invoice,
      createdAt: batch.createdAt,
    };
  });
}

export async function listRecentMovements(take = 50) {
  const movements = await prisma.fabricMovement.findMany({
    take,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: {
      batch: {
        select: {
          id: true,
          fabricCode: true,
          fabricType: true,
          colour: true,
        },
      },
      manufacturer: {
        select: { id: true, name: true },
      },
      lpo: {
        select: { id: true, lpoNumber: true, nickname: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return movements.map((row) => ({
    id: row.id,
    type: row.type,
    quantityMeters: Number(row.quantityMeters),
    transportRef: row.transportRef,
    note: row.note,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    batch: row.batch,
    manufacturer: row.manufacturer,
    lpo: row.lpo,
    createdBy: row.createdBy,
  }));
}
