import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { summariseToday, type TodaySummary } from "@/modules/lpo/domain/today";

/** Open LPOs summarised for the Today page. Read-only. */
export async function getTodaySummary(now = new Date()): Promise<TodaySummary> {
  const rows = await prisma.lpo.findMany({
    where: { status: { not: LpoStatus.CLIENT_DELIVERY_COMPLETED } },
    select: {
      id: true,
      lpoNumber: true,
      nickname: true,
      clientName: true,
      status: true,
      isUrgent: true,
      manufacturerAssignmentAt: true,
      productionDeadlineAt: true,
      clientDeliveryAt: true,
      manufacturer: { select: { name: true } },
    },
  });

  return summariseToday(
    rows.map((row) => ({
      id: row.id,
      lpoNumber: row.lpoNumber,
      nickname: row.nickname,
      clientName: row.clientName,
      status: row.status,
      isUrgent: row.isUrgent,
      manufacturerAssignmentAt: row.manufacturerAssignmentAt,
      productionDeadlineAt: row.productionDeadlineAt,
      clientDeliveryAt: row.clientDeliveryAt,
      manufacturerName: row.manufacturer?.name ?? null,
    })),
    now,
  );
}

/**
 * Metres of fabric available now, and how many batches still have some. One
 * grouped query: it adds up each active batch's movements in the database
 * instead of loading every movement.
 */
export async function getFabricOnHand(): Promise<{
  meters: number;
  batches: number;
}> {
  const perBatch = await prisma.fabricMovement.groupBy({
    by: ["batchId"],
    where: { batch: { isActive: true } },
    _sum: { quantityMeters: true },
  });
  const stocks = perBatch.map((row) => Number(row._sum.quantityMeters ?? 0));
  const inStock = stocks.filter((meters) => meters > 0);
  return {
    meters: inStock.reduce((sum, meters) => sum + meters, 0),
    batches: inStock.length,
  };
}
