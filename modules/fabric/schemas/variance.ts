import { FabricVarianceReason } from "@prisma/client";
import { z } from "zod";

export const createVarianceSchema = z.object({
  expectedMeters: z.number(),
  actualMeters: z.number(),
  reason: z.nativeEnum(FabricVarianceReason),
  batchId: z.string().trim().min(1).optional(),
  manufacturerId: z.string().trim().min(1).optional(),
  lpoId: z.string().trim().min(1).optional(),
  note: z.string().trim().optional(),
});

export type CreateVarianceValues = z.infer<typeof createVarianceSchema>;
