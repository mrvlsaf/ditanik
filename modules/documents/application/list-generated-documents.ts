import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  INDEPENDENT_DOCUMENT_TYPES,
  siteCodeFromDocumentNumber,
  type IndependentDocumentType,
} from "@/modules/documents/domain/independent-document";

export async function listGeneratedDocumentsForLpo(lpoId: string) {
  return prisma.generatedDocument.findMany({
    where: { lpoId },
    orderBy: { generatedAt: "desc" },
    include: {
      generatedBy: { select: { name: true, email: true } },
    },
  });
}

export const ALL_DOCUMENTS_LIMIT = 200;

export type ListAllGeneratedDocumentsFilters = {
  type?: string;
  source?: string;
  q?: string;
};

/** Every generated document — LPO-linked and independent — newest first. */
export async function listAllGeneratedDocuments(
  filters: ListAllGeneratedDocumentsFilters = {},
) {
  const q = filters.q?.trim();
  const type = INDEPENDENT_DOCUMENT_TYPES.includes(
    filters.type as IndependentDocumentType,
  )
    ? (filters.type as IndependentDocumentType)
    : undefined;

  const where: Prisma.GeneratedDocumentWhereInput = {};
  if (type) {
    where.type = type;
  }
  if (filters.source === "lpo") {
    where.lpoId = { not: null };
  } else if (filters.source === "independent") {
    where.lpoId = null;
  }
  if (q) {
    where.OR = [
      { documentNumber: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { lpo: { lpoNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  return prisma.generatedDocument.findMany({
    where,
    orderBy: { generatedAt: "desc" },
    take: ALL_DOCUMENTS_LIMIT,
    include: {
      generatedBy: { select: { name: true, email: true } },
      lpo: { select: { id: true, lpoNumber: true, clientName: true } },
    },
  });
}

/**
 * Site codes already in use — from LPOs and from previously generated
 * documents — to suggest while typing on the New document form.
 */
export async function listKnownSiteCodes(): Promise<string[]> {
  const [lpos, documents] = await Promise.all([
    prisma.lpo.findMany({
      where: { siteCode: { not: null } },
      select: { siteCode: true },
      distinct: ["siteCode"],
    }),
    prisma.generatedDocument.findMany({
      select: { documentNumber: true },
      orderBy: { generatedAt: "desc" },
      take: 2000,
    }),
  ]);

  const codes = new Set<string>();
  for (const lpo of lpos) {
    if (lpo.siteCode?.trim()) codes.add(lpo.siteCode.trim().toUpperCase());
  }
  for (const doc of documents) {
    const code = siteCodeFromDocumentNumber(doc.documentNumber);
    if (code) codes.add(code);
  }
  return [...codes].sort((a, b) => a.localeCompare(b));
}

/** One generated document with everything the edit page needs, or null. */
export async function getGeneratedDocument(id: string) {
  return prisma.generatedDocument.findUnique({
    where: { id },
    include: { lpo: { select: { id: true, lpoNumber: true } } },
  });
}
