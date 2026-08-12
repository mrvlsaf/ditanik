import { prisma } from "@/lib/db";
import {
  groupManufacturerMovementsByLpo,
} from "@/modules/fabric/domain/manufacturer-ledger";
import {
  calculateAdditionalFabricRequired,
  roundMeters,
} from "@/modules/fabric/domain/meters";

export type ManufacturerFabricLedgerBatch = {
  batchId: string;
  fabricCode: string;
  fabricType: string;
  colour: string;
  sent: number;
  used: number;
  returned: number;
  expectedBalance: number;
};

export type ManufacturerLpoLedgerSection = {
  lpoId: string;
  lpoNumber: string;
  nickname: string | null;
  expectedFabricRequirement: number;
  batches: ManufacturerFabricLedgerBatch[];
  totalSent: number;
  totalExpectedBalance: number;
  additionalFabricRequired: number;
};

export type ManufacturerStandaloneLedger = {
  batches: ManufacturerFabricLedgerBatch[];
  totalSent: number;
  totalExpectedBalance: number;
};

export type ManufacturerFabricLedger = {
  manufacturerId: string;
  lpoSections: ManufacturerLpoLedgerSection[];
  standalone: ManufacturerStandaloneLedger;
  batches: ManufacturerFabricLedgerBatch[];
  totalExpectedFabricRequirement: number;
  totalExpectedBalance: number;
};

function sortBatches(
  batches: ManufacturerFabricLedgerBatch[],
): ManufacturerFabricLedgerBatch[] {
  return [...batches].sort((a, b) => a.fabricCode.localeCompare(b.fabricCode));
}

function totalsFromBatches(batches: ManufacturerFabricLedgerBatch[]): {
  totalSent: number;
  totalExpectedBalance: number;
} {
  return {
    totalSent: roundMeters(batches.reduce((sum, b) => sum + b.sent, 0)),
    totalExpectedBalance: roundMeters(
      batches.reduce((sum, b) => sum + b.expectedBalance, 0),
    ),
  };
}

function toBatchRow(
  bucket: ReturnType<typeof groupManufacturerMovementsByLpo>[number],
): ManufacturerFabricLedgerBatch {
  return {
    batchId: bucket.batchId,
    fabricCode: bucket.fabricCode,
    fabricType: bucket.fabricType,
    colour: bucket.colour,
    sent: bucket.sent,
    used: bucket.used,
    returned: bucket.returned,
    expectedBalance: bucket.expectedBalance,
  };
}

/**
 * Manufacturer fabric ledger split by LPO (and a standalone no-LPO pool).
 */
export async function getManufacturerFabricLedger(
  manufacturerId: string,
): Promise<ManufacturerFabricLedger> {
  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
    select: { id: true },
  });
  if (!manufacturer) {
    throw new Error("Manufacturer not found.");
  }

  const [movements, assignedLpos, requirements] = await Promise.all([
    prisma.fabricMovement.findMany({
      where: { manufacturerId },
      select: {
        type: true,
        quantityMeters: true,
        batchId: true,
        lpoId: true,
        batch: {
          select: {
            fabricCode: true,
            fabricType: true,
            colour: true,
          },
        },
      },
    }),
    prisma.lpo.findMany({
      where: { manufacturerId },
      select: { id: true, lpoNumber: true, nickname: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lpoFabricRequirement.findMany({
      where: { lpo: { manufacturerId } },
      select: { lpoId: true, expectedMeters: true },
    }),
  ]);

  const expectedByLpo = new Map<string, number>();
  for (const row of requirements) {
    const prev = expectedByLpo.get(row.lpoId) ?? 0;
    expectedByLpo.set(
      row.lpoId,
      roundMeters(prev + Number(row.expectedMeters)),
    );
  }

  const grouped = groupManufacturerMovementsByLpo(
    movements.map((row) => ({
      batchId: row.batchId,
      lpoId: row.lpoId,
      type: row.type,
      quantityMeters: Number(row.quantityMeters),
      fabricCode: row.batch.fabricCode,
      fabricType: row.batch.fabricType,
      colour: row.batch.colour,
    })),
  );

  const batchesByLpo = new Map<string, ManufacturerFabricLedgerBatch[]>();
  const standaloneBatches: ManufacturerFabricLedgerBatch[] = [];
  const uniqueByBatchId = new Map<string, ManufacturerFabricLedgerBatch>();

  for (const bucket of grouped) {
    const row = toBatchRow(bucket);
    if (bucket.lpoId) {
      const list = batchesByLpo.get(bucket.lpoId) ?? [];
      list.push(row);
      batchesByLpo.set(bucket.lpoId, list);
    } else {
      standaloneBatches.push(row);
    }

    const existingUnique = uniqueByBatchId.get(bucket.batchId);
    if (!existingUnique) {
      uniqueByBatchId.set(bucket.batchId, { ...row });
    } else {
      uniqueByBatchId.set(bucket.batchId, {
        ...existingUnique,
        sent: roundMeters(existingUnique.sent + row.sent),
        used: roundMeters(existingUnique.used + row.used),
        returned: roundMeters(existingUnique.returned + row.returned),
        expectedBalance: roundMeters(
          existingUnique.expectedBalance + row.expectedBalance,
        ),
      });
    }
  }

  const lpoSections: ManufacturerLpoLedgerSection[] = assignedLpos.map(
    (lpo) => {
      const batches = sortBatches(batchesByLpo.get(lpo.id) ?? []);
      const { totalSent, totalExpectedBalance } = totalsFromBatches(batches);
      const expectedFabricRequirement = expectedByLpo.get(lpo.id) ?? 0;
      return {
        lpoId: lpo.id,
        lpoNumber: lpo.lpoNumber,
        nickname: lpo.nickname,
        expectedFabricRequirement,
        batches,
        totalSent,
        totalExpectedBalance,
        additionalFabricRequired: calculateAdditionalFabricRequired(
          expectedFabricRequirement,
          totalExpectedBalance,
        ),
      };
    },
  );

  const orphanLpoIds = [...batchesByLpo.keys()].filter(
    (id) => !lpoSections.some((s) => s.lpoId === id),
  );
  if (orphanLpoIds.length > 0) {
    const orphanLpos = await prisma.lpo.findMany({
      where: { id: { in: orphanLpoIds } },
      select: { id: true, lpoNumber: true, nickname: true },
    });
    for (const lpo of orphanLpos) {
      const sorted = sortBatches(batchesByLpo.get(lpo.id) ?? []);
      const { totalSent, totalExpectedBalance } = totalsFromBatches(sorted);
      const expectedFabricRequirement = expectedByLpo.get(lpo.id) ?? 0;
      lpoSections.push({
        lpoId: lpo.id,
        lpoNumber: lpo.lpoNumber,
        nickname: lpo.nickname,
        expectedFabricRequirement,
        batches: sorted,
        totalSent,
        totalExpectedBalance,
        additionalFabricRequired: calculateAdditionalFabricRequired(
          expectedFabricRequirement,
          totalExpectedBalance,
        ),
      });
    }
  }

  lpoSections.sort((a, b) => a.lpoNumber.localeCompare(b.lpoNumber));

  const standaloneSorted = sortBatches(standaloneBatches);
  const standaloneTotals = totalsFromBatches(standaloneSorted);
  const batches = sortBatches([...uniqueByBatchId.values()]);
  const totalExpectedFabricRequirement = roundMeters(
    lpoSections.reduce((sum, s) => sum + s.expectedFabricRequirement, 0),
  );
  const totalExpectedBalance = roundMeters(
    lpoSections.reduce((sum, s) => sum + s.totalExpectedBalance, 0) +
      standaloneTotals.totalExpectedBalance,
  );

  return {
    manufacturerId,
    lpoSections,
    standalone: {
      batches: standaloneSorted,
      totalSent: standaloneTotals.totalSent,
      totalExpectedBalance: standaloneTotals.totalExpectedBalance,
    },
    batches,
    totalExpectedFabricRequirement,
    totalExpectedBalance,
  };
}
