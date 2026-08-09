import { z } from "zod";

export const recordUsageSchema = z.object({
  batchId: z.string().trim().min(1, "Batch is required"),
  manufacturerId: z.string().trim().min(1, "Manufacturer is required"),
  lpoId: z.string().trim().min(1, "LPO is required"),
  quantityMeters: z.number().positive("Quantity must be greater than 0"),
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  note: z.string().trim().optional(),
});

export type RecordUsageValues = z.infer<typeof recordUsageSchema>;
