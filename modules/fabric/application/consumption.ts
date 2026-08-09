import { prisma } from "@/lib/db";
import { createConsumptionRateSchema } from "@/modules/fabric/schemas/consumption";

export async function listActiveRates() {
  const rates = await prisma.garmentConsumptionRate.findMany({
    where: { isActive: true },
    orderBy: { garmentName: "asc" },
  });

  return rates.map((rate) => ({
    id: rate.id,
    garmentName: rate.garmentName,
    metersPerUnit: Number(rate.metersPerUnit),
    isActive: rate.isActive,
    createdAt: rate.createdAt,
    updatedAt: rate.updatedAt,
  }));
}

export type CreateConsumptionRateInput = {
  garmentName: string;
  metersPerUnit: number;
};

export async function createRate(input: CreateConsumptionRateInput) {
  const values = createConsumptionRateSchema.parse(input);

  const existing = await prisma.garmentConsumptionRate.findUnique({
    where: { garmentName: values.garmentName },
  });
  if (existing) {
    if (existing.isActive) {
      throw new Error("A consumption rate for this garment already exists.");
    }
    return prisma.garmentConsumptionRate.update({
      where: { id: existing.id },
      data: {
        metersPerUnit: values.metersPerUnit,
        isActive: true,
      },
    });
  }

  return prisma.garmentConsumptionRate.create({
    data: {
      garmentName: values.garmentName,
      metersPerUnit: values.metersPerUnit,
      isActive: true,
    },
  });
}

export async function deactivateRate(rateId: string) {
  const rate = await prisma.garmentConsumptionRate.findUnique({
    where: { id: rateId },
  });
  if (!rate) {
    throw new Error("Consumption rate not found.");
  }
  if (!rate.isActive) {
    return rate;
  }

  return prisma.garmentConsumptionRate.update({
    where: { id: rateId },
    data: { isActive: false },
  });
}
