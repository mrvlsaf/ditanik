import { LpoDateField } from "@prisma/client";
import { z } from "zod";

import { MIN_DATE_CHANGE_REASON_LENGTH } from "@/modules/lpo/domain/due-dates";

export const changeLpoDateSchema = z
  .object({
    field: z.nativeEnum(LpoDateField),
    newDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "New date must be YYYY-MM-DD"),
    reason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const reason = (value.reason ?? "").trim();
    const reasonRequired =
      value.field === LpoDateField.ASSIGNMENT ||
      value.field === LpoDateField.PRODUCTION_DEADLINE;

    if (reasonRequired && reason.length < MIN_DATE_CHANGE_REASON_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: `Reason is required (min ${MIN_DATE_CHANGE_REASON_LENGTH} characters).`,
      });
    }
  });

export type ChangeLpoDateValues = z.infer<typeof changeLpoDateSchema>;
