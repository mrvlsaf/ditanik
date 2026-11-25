import { prisma } from "@/lib/db";
import {
  issuedOutMeters,
  startOfBusinessMonth,
  type MovementTotals,
} from "@/modules/fabric/domain/fabric-glance";
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
    where: { isActive: true },
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

/** The three numbers at the top of the Fabric page. */
export async function getFabricGlance(now = new Date()) {
  const monthStart = startOfBusinessMonth(now);

  const [totalsByType, receivedThisMonth] = await Promise.all([
    prisma.fabricMovement.groupBy({
      by: ["type"],
      where: { batch: { isActive: true } },
      _sum: { quantityMeters: true },
    }),
    prisma.fabricMovement.findMany({
      where: {
        type: "RECEIVED",
        occurredAt: { gte: monthStart },
        batch: { isActive: true },
      },
      select: { quantityMeters: true, batch: { select: { invoiceId: true } } },
    }),
  ]);

  const totals: MovementTotals = {};
  for (const row of totalsByType) {
    totals[row.type] = Number(row._sum.quantityMeters ?? 0);
  }

  return {
    availableMeters: Object.values(totals).reduce((sum, value) => sum + value, 0),
    issuedOutMeters: issuedOutMeters(totals),
    receivedThisMonthMeters: receivedThisMonth.reduce(
      (sum, row) => sum + Number(row.quantityMeters),
      0,
    ),
    receivedThisMonthInvoices: new Set(
      receivedThisMonth.map((row) => row.batch.invoiceId),
    ).size,
  };
}
