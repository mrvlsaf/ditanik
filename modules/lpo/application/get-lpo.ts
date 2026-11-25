import { LpoStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  LPO_PAGE_SIZE,
  lpoFilterWhere,
  pageWindow,
  type LpoFilterKey,
} from "@/modules/lpo/domain/lpo-filters";
import { formatUrgentLpoNumber } from "@/modules/lpo/domain/urgent-lpo";

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

/**
 * How many LPOs sit under each list filter, for the counts on the chips.
 * Three queries (one grouped by status, one each for Overdue and Urgent) rather than one per
 * chip, so opening the list does not fan out into many connections.
 */
export async function countLposByFilter(
  now = new Date(),
): Promise<Record<LpoFilterKey, number>> {
  const [byStatus, overdue, urgent] = await Promise.all([
    prisma.lpo.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lpo.count({ where: lpoFilterWhere("overdue", now) }),
    prisma.lpo.count({ where: lpoFilterWhere("urgent", now) }),
  ]);

  const countFor = (status: LpoStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    all: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    "under-review": countFor(LpoStatus.UNDER_REVIEW),
    "with-manufacturers": countFor(LpoStatus.ASSIGNED_TO_MANUFACTURER),
    completed: countFor(LpoStatus.CLIENT_DELIVERY_COMPLETED),
    overdue,
    urgent,
  };
}

/**
 * One page of the LPO list under a filter, newest first. `total` is how many
 * LPOs the filter matches (from countLposByFilter), so it is not counted twice.
 */
export async function listLposPage(input: {
  filter: LpoFilterKey;
  page: number;
  total: number;
  now?: Date;
  pageSize?: number;
}) {
  const now = input.now ?? new Date();
  const pageSize = input.pageSize ?? LPO_PAGE_SIZE;
  const where = lpoFilterWhere(input.filter, now);

  const window = pageWindow(input.page, input.total, pageSize);
  const rows = await prisma.lpo.findMany({
    where,
    skip: window.skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      manufacturer: { select: { id: true, name: true } },
    },
  });

  return { rows, total: input.total, window };
}

/**
 * The number the next urgent LPO will get (URGENT_6 after five). Only a
 * preview for the New LPO form: the real number is taken from the counter
 * when the LPO is saved, so two people creating at once never share one.
 */
export async function getNextUrgentLpoNumber(): Promise<string> {
  const counter = await prisma.urgentLpoCounter.findUnique({ where: { id: 1 } });
  return formatUrgentLpoNumber((counter?.lastValue ?? 0) + 1);
}
