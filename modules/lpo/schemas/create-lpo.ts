import { z } from "zod";

export const createLpoFormSchema = z.object({
  lpoNumber: z.string().trim().min(1, "LPO number is required"),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD"),
  reviewDueDays: z.coerce.number().int().min(1, "Review due days must be at least 1"),
  deliveryDueDays: z.coerce
    .number()
    .int()
    .min(1, "Delivery due days must be at least 1"),
});

export type CreateLpoFormValues = z.infer<typeof createLpoFormSchema>;
