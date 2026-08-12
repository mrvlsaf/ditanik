import { prisma } from "@/lib/db";

export async function countUnreadNotifications() {
  return prisma.notification.count({
    where: { readAt: null },
  });
}

export async function listRecentNotifications(take = 10) {
  return prisma.notification.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: {
      lpo: { select: { id: true, lpoNumber: true, nickname: true } },
    },
  });
}

export async function listNotifications(input?: {
  unreadOnly?: boolean;
  take?: number;
}) {
  return prisma.notification.findMany({
    take: input?.take ?? 100,
    where: input?.unreadOnly ? { readAt: null } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      lpo: { select: { id: true, lpoNumber: true, nickname: true } },
    },
  });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  return prisma.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
}
