import { prisma } from "@/lib/db";
import { createGeneratedDocument } from "@/modules/documents/application/create-generated-document";
import {
  independentDocumentSchema,
  siteCodeFromDocumentNumber,
  toIndependentLineRows,
} from "@/modules/documents/domain/independent-document";
import { isSameBusinessDay } from "@/modules/documents/domain/quotation-edit";

export type EditQuotationInput = {
  documentId: string;
  /** Raw, untrusted form values, validated here. */
  values: unknown;
  editedByUserId: string;
  /** Injectable for tests; defaults to now. */
  now?: Date;
};

/**
 * Edits a generated quotation by replacing it; the old version is not kept. On the day
 * it was made (Dubai time) it keeps its number and date. On a later day it gets today's
 * date and a new number, and the old number is retired.
 */
export async function editQuotationDocument(input: EditQuotationInput) {
  const existing = await prisma.generatedDocument.findUnique({
    where: { id: input.documentId },
  });
  if (!existing || existing.type !== "QUOTATION") {
    throw new Error("Quotation not found.");
  }

  const parsed = independentDocumentSchema.safeParse({
    ...(input.values as Record<string, unknown>),
    type: "QUOTATION",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid quotation details.");
  }
  const values = parsed.data;

  const snapshot = existing.snapshot as { lpo?: Record<string, unknown> | null } | null;
  const common = {
    type: "QUOTATION" as const,
    client: {
      clientName: values.clientName,
      clientSubEntityName: values.clientSubEntityName || null,
      clientTrn: values.clientTrn || null,
      address: values.address,
    },
    lpo: existing.lpoId ? { id: existing.lpoId, snapshot: snapshot?.lpo ?? {} } : null,
    lineItems: toIndependentLineRows(values.lineItems),
    paymentTerms: values.paymentTerms || null,
  };

  const now = input.now ?? new Date();
  if (isSameBusinessDay(existing.generatedAt, now)) {
    const document = await createGeneratedDocument({
      ...common,
      generatedByUserId: existing.generatedById,
      siteCode: siteCodeFromDocumentNumber(existing.documentNumber) ?? values.siteCode,
      generatedAt: existing.generatedAt,
      replace: { id: existing.id, documentNumber: existing.documentNumber },
    });
    return { document, mode: "updated" as const };
  }

  const document = await createGeneratedDocument({
    ...common,
    generatedByUserId: input.editedByUserId,
    siteCode: values.siteCode,
    generatedAt: now,
    replace: { id: existing.id },
  });
  return {
    document,
    mode: "renumbered" as const,
    previousNumber: existing.documentNumber,
  };
}
