import { z } from "zod";

export const createConsumptionRateSchema = z.object({
  garmentName: z.string().trim().min(1, "Garment name is required"),
  metersPerUnit: z.number().positive("Meters per unit must be greater than 0"),
});

export type CreateConsumptionRateValues = z.infer<
  typeof createConsumptionRateSchema
>;
