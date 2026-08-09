import { z } from "zod";

export const addLpoFabricRequirementSchema = z
  .object({
    lpoId: z.string().trim().min(1, "LPO is required"),
    consumptionRateId: z.string().trim().min(1).optional(),
    garmentName: z.string().trim().min(1).optional(),
    metersPerUnit: z.number().positive().optional(),
    quantity: z.number().int().min(1, "Quantity must be an integer of at least 1"),
  })
  .superRefine((value, ctx) => {
    const hasRate = Boolean(value.consumptionRateId);
    const hasInline =
      Boolean(value.garmentName?.trim()) &&
      typeof value.metersPerUnit === "number";

    if (hasRate === hasInline) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either a consumption rate id, or garment name with meters per unit.",
      });
    }
  });

export type AddLpoFabricRequirementValues = z.infer<
  typeof addLpoFabricRequirementSchema
>;
