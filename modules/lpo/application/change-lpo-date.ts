import { LpoDateField } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  assertDateChangeReason,
  calculateDueAtFromCalendarDate,
} from "@/modules/lpo/domain/due-dates";
import { changeLpoDateSchema } from "@/modules/lpo/schemas/change-lpo-date";

export type ChangeLpoDateInput = {
  lpoId: string;
  field: LpoDateField;
  newDate: string;
  reason?: string;
  changedByUserId: string;
};

function currentValueForField(
  lpo: {
    manufacturerAssignmentAt: Date | null;
    productionDeadlineAt: Date | null;
    clientDeliveryAt: Date | null;
  },
  field: LpoDateField,
): Date | null {
  switch (field) {
    case LpoDateField.ASSIGNMENT:
      return lpo.manufacturerAssignmentAt;
    case LpoDateField.PRODUCTION_DEADLINE:
      return lpo.productionDeadlineAt;
    case LpoDateField.CLIENT_DELIVERY:
      return lpo.clientDeliveryAt;
  }
}

function updateDataForField(field: LpoDateField, newValue: Date) {
  switch (field) {
    case LpoDateField.ASSIGNMENT:
      return { manufacturerAssignmentAt: newValue };
    case LpoDateField.PRODUCTION_DEADLINE:
      return { productionDeadlineAt: newValue };
    case LpoDateField.CLIENT_DELIVERY:
      return { clientDeliveryAt: newValue };
  }
}

export async function changeLpoDate(input: ChangeLpoDateInput) {
  const values = changeLpoDateSchema.parse({
    field: input.field,
    newDate: input.newDate,
    reason: input.reason,
  });

  assertDateChangeReason(values.field, values.reason);

  const lpo = await prisma.lpo.findUnique({ where: { id: input.lpoId } });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  if (lpo.isUrgent) {
    throw new Error("Urgent LPOs have no planned dates to change.");
  }

  const oldValue = currentValueForField(lpo, values.field);
  if (!oldValue) {
    throw new Error("This LPO has no planned date to change.");
  }
  const newValue = calculateDueAtFromCalendarDate(values.newDate);

  if (oldValue.getTime() === newValue.getTime()) {
    throw new Error("New date must be different from the current date.");
  }

  const reason =
    values.field === LpoDateField.CLIENT_DELIVERY
      ? (values.reason?.trim() || null)
      : values.reason!.trim();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: lpo.id },
      data: updateDataForField(values.field, newValue),
    });

    await tx.lpoDateChange.create({
      data: {
        lpoId: lpo.id,
        field: values.field,
        oldValue,
        newValue,
        reason,
        changedById: input.changedByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: lpo.id,
        action: "LPO_DATE_CHANGED",
        actorId: input.changedByUserId,
        payload: {
          field: values.field,
          oldValue: oldValue.toISOString(),
          newValue: newValue.toISOString(),
          reason,
        },
      },
    });

    return updated;
  });
}
