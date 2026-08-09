import { z } from "zod";

export const createLpoFormSchema = z.object({
  lpoNumber: z.string().trim().min(1, "LPO number is required"),
  nickname: z.string().trim().min(1, "Nickname is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD"),
});

export type CreateLpoFormValues = z.infer<typeof createLpoFormSchema>;
