import { z } from "zod";

import { MIN_DUE_DATE_JUSTIFICATION_LENGTH } from "@/modules/lpo/domain/due-dates";

export const changeLpoDueDateSchema = z.object({
  field: z.enum(["REVIEW", "DELIVERY"]),
  newDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD."),
  justification: z
    .string()
    .trim()
    .min(
      MIN_DUE_DATE_JUSTIFICATION_LENGTH,
      `Justification must be at least ${MIN_DUE_DATE_JUSTIFICATION_LENGTH} characters.`,
    )
    .max(2000),
});
