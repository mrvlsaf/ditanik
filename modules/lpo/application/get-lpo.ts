import { prisma } from "@/lib/db";

export async function getLpoById(id: string) {
  return prisma.lpo.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
      manufacturer: { select: { id: true, name: true } },
      dateChanges: {
        orderBy: { createdAt: "desc" },
        include: {
          changedBy: { select: { email: true, name: true } },
        },
      },
      lineItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function listRecentLpos(take = 50) {
  return prisma.lpo.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: {
      manufacturer: { select: { id: true, name: true } },
    },
  });
}
