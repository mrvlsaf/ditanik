import { z } from "zod";

export const issueFabricSchema = z.object({
  batchId: z.string().trim().min(1, "Batch is required"),
  manufacturerId: z.string().trim().min(1, "Manufacturer is required"),
  quantityMeters: z.number().positive("Quantity must be greater than 0"),
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  transportRef: z.string().trim().optional(),
  lpoId: z.string().trim().min(1).optional(),
});

export type IssueFabricValues = z.infer<typeof issueFabricSchema>;
