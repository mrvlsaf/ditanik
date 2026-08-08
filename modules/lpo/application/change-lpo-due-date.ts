import { prisma } from "@/lib/db";
import {
  calculateDueAtFromCalendarDate,
  isDueDateJustificationValid,
} from "@/modules/lpo/domain/due-dates";
import { changeLpoDueDateSchema } from "@/modules/lpo/schemas/change-lpo-due-date";

export type ChangeLpoDueDateInput = {
  lpoId: string;
  field: "REVIEW" | "DELIVERY";
  newDueDate: string;
  justification: string;
  changedByUserId: string;
};

export async function changeLpoDueDate(input: ChangeLpoDueDateInput) {
  const values = changeLpoDueDateSchema.parse({
    field: input.field,
    newDueDate: input.newDueDate,
    justification: input.justification,
  });

  if (!isDueDateJustificationValid(values.justification)) {
    throw new Error("Justification is required (at least 10 characters).");
  }

  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: {
      id: true,
      reviewDueAt: true,
      deliveryDueAt: true,
    },
  });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  const oldValue =
    values.field === "REVIEW" ? lpo.reviewDueAt : lpo.deliveryDueAt;
  const newValue = calculateDueAtFromCalendarDate(values.newDueDate);

  if (oldValue.getTime() === newValue.getTime()) {
    throw new Error("New due date must be different from the current one.");
  }

  const fieldData =
    values.field === "REVIEW"
      ? { reviewDueAt: newValue }
      : { deliveryDueAt: newValue };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: input.lpoId },
      data: fieldData,
    });

    await tx.lpoDueDateChange.create({
      data: {
        lpoId: input.lpoId,
        field: values.field,
        oldValue,
        newValue,
        justification: values.justification,
        changedById: input.changedByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_DUE_DATE_CHANGED",
        actorId: input.changedByUserId,
        payload: {
          field: values.field,
          oldValue: oldValue.toISOString(),
          newValue: newValue.toISOString(),
        },
      },
    });

    return updated;
  });
}
