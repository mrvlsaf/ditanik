import { DB_TRANSACTION_OPTIONS, prisma } from "@/lib/db";

export async function deleteLpo(input: {
  lpoId: string;
  actorUserId: string;
}) {
  const existing = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: { id: true, lpoNumber: true, nickname: true },
  });
  if (!existing) {
    throw new Error("LPO not found.");
  }

  const generatedDocumentCount = await prisma.generatedDocument.count({
    where: { lpoId: input.lpoId },
  });
  if(generatedDocumentCount > 0) {
    throw new Error(
      `This LPO has ${generatedDocumentCount} generated documents (quotations, invoices, etc.) and can't be deleted - they're the permanent record for this order. Remove those documents first if you really need to delete it.`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.fabricMovement.updateMany({
      where: { lpoId: input.lpoId },
      data: { lpoId: null },
    });
    await tx.fabricVariance.deleteMany({ where: { lpoId: input.lpoId } });
    await tx.lpo.delete({ where: { id: input.lpoId } });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: existing.id,
        action: "LPO_DELETED",
        actorId: input.actorUserId,
        payload: {
          lpoNumber: existing.lpoNumber,
          nickname: existing.nickname,
        },
      },
    });
  }, DB_TRANSACTION_OPTIONS);

  return existing;
}
