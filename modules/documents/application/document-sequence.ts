import type { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dubaiCalendarDayKey } from "@/modules/documents/domain/document-numbering";

/**
 * Atomically allocates the next sequence number for (type, today-in-Dubai).
 * Postgres compiles Prisma's upsert to an INSERT ... ON CONFLICT DO UPDATE,
 * so concurrent generations of the same document type today cannot collide —
 * same pattern already used for fabric-code allocation.
 */
export async function allocateDocumentSequence(
  type: DocumentType,
  generatedAt: Date,
): Promise<number> {
  const calendarDay = dubaiCalendarDayKey(generatedAt);

  const updated = await prisma.documentSequence.upsert({
    where: { type_calendarDay: { type, calendarDay } },
    create: { type, calendarDay, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });

  return updated.lastSequence;
}
