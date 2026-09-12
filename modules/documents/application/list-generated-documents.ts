import { prisma } from "@/lib/db";

export async function listGeneratedDocumentsForLpo(lpoId: string) {
  return prisma.generatedDocument.findMany({
    where: { lpoId },
    orderBy: { generatedAt: "desc" },
    include: {
      generatedBy: { select: { name: true, email: true } },
    },
  });
}
