import { prisma } from "@/lib/db";
import { summarizeManufacturerBatchLedger } from "@/modules/fabric/domain/manufacturer-ledger";
import { roundMeters } from "@/modules/fabric/domain/meters";

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

export type ManufacturerFabricLedger = {
  manufacturerId: string;
  batches: ManufacturerFabricLedgerBatch[];
  totalExpectedFabricRequirement: number;
};

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

  const movements = await prisma.fabricMovement.findMany({
    where: { manufacturerId },
    select: {
      type: true,
      quantityMeters: true,
      batchId: true,
      batch: {
        select: {
          id: true,
          fabricCode: true,
          fabricType: true,
          colour: true,
        },
      },
    },
  });

  const byBatch = new Map<
    string,
    {
      fabricCode: string;
      fabricType: string;
      colour: string;
      movements: Array<{ type: (typeof movements)[number]["type"]; quantityMeters: number }>;
    }
  >();

  for (const row of movements) {
    const existing = byBatch.get(row.batchId);
    const movement = {
      type: row.type,
      quantityMeters: Number(row.quantityMeters),
    };
    if (existing) {
      existing.movements.push(movement);
    } else {
      byBatch.set(row.batchId, {
        fabricCode: row.batch.fabricCode,
        fabricType: row.batch.fabricType,
        colour: row.batch.colour,
        movements: [movement],
      });
    }
  }

  const batches: ManufacturerFabricLedgerBatch[] = [...byBatch.entries()]
    .map(([batchId, data]) => {
      const summary = summarizeManufacturerBatchLedger(data.movements);
      return {
        batchId,
        fabricCode: data.fabricCode,
        fabricType: data.fabricType,
        colour: data.colour,
        ...summary,
      };
    })
    .sort((a, b) => a.fabricCode.localeCompare(b.fabricCode));

  const requirements = await prisma.lpoFabricRequirement.findMany({
    where: {
      lpo: { manufacturerId },
    },
    select: { expectedMeters: true },
  });

  const totalExpectedFabricRequirement = roundMeters(
    requirements.reduce(
      (sum, row) => sum + Number(row.expectedMeters),
      0,
    ),
  );

  return {
    manufacturerId,
    batches,
    totalExpectedFabricRequirement,
  };
}
