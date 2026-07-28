import { prisma } from "@/lib/db";
import { addLpoCommentSchema } from "@/modules/lpo/schemas/add-lpo-comment";

export type AddLpoCommentInput = {
  lpoId: string;
  body: string;
  createdByUserId: string;
};

export async function addLpoComment(input: AddLpoCommentInput) {
  const values = addLpoCommentSchema.parse({ body: input.body });

  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
    select: { id: true },
  });
  if (!lpo) {
    throw new Error("LPO not found.");
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.lpoComment.create({
      data: {
        lpoId: input.lpoId,
        body: values.body,
        createdById: input.createdByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_COMMENT_ADDED",
        actorId: input.createdByUserId,
        payload: { commentId: comment.id },
      },
    });

    return comment;
  });
}
