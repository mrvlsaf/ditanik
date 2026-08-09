import { z } from "zod";

export const assignManufacturerSchema = z.object({
  manufacturerId: z.string().trim().min(1).optional(),
  newManufacturerName: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  const hasExisting = Boolean(value.manufacturerId);
  const hasNew = Boolean(value.newManufacturerName?.trim());
  if (hasExisting === hasNew) {
    ctx.addIssue({
      code: "custom",
      message: "Select an existing manufacturer or enter a new name (not both).",
    });
  }
});

export type AssignManufacturerValues = z.infer<typeof assignManufacturerSchema>;
