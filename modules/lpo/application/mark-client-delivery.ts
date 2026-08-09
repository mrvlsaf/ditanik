import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertCanMarkClientDeliveryCompleted } from "@/modules/lpo/domain/lpo-status";

export async function markClientDeliveryCompleted(input: {
  lpoId: string;
  actorUserId: string;
}) {
  const lpo = await prisma.lpo.findUnique({ where: { id: input.lpoId } });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  assertCanMarkClientDeliveryCompleted({
    status: lpo.status,
    productionFileKey: lpo.productionFileKey,
    manufacturerId: lpo.manufacturerId,
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: lpo.id },
      data: {
        status: LpoStatus.CLIENT_DELIVERY_COMPLETED,
        clientDeliveredAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: lpo.id,
        action: "LPO_CLIENT_DELIVERY_COMPLETED",
        actorId: input.actorUserId,
      },
    });

    return updated;
  });
}
