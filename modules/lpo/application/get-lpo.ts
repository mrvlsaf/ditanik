import { prisma } from "@/lib/db";

export async function getLpoById(id: string) {
  return prisma.lpo.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      dueDateChanges: {
        orderBy: { createdAt: "desc" },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });
}

export async function listRecentLpos(take = 50) {
  return prisma.lpo.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      lpoNumber: true,
      receivedDate: true,
      reviewDueAt: true,
      deliveryDueAt: true,
      originalFileKey: true,
      originalFileName: true,
      status: true,
    },
  });
}
