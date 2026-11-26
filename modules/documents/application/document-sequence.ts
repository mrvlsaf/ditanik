import type { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dubaiCalendarDayKey } from "@/modules/documents/domain/document-numbering";

/**
 * Atomically allocates the next sequence number for (type, today-in-Dubai) via an
 * upsert (INSERT ... ON CONFLICT), so concurrent generations cannot collide.
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
