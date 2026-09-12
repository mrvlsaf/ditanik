import { prisma } from "@/lib/db";
import { calculateLineTotal } from "@/modules/lpo/domain/line-items";
import { editLpoFormSchema } from "@/modules/lpo/schemas/edit-lpo";
import type { LpoLineItemValues } from "@/modules/lpo/schemas/line-items";

export type UpdateLpoInput = {
  lpoId: string;
  nickname: string;
  clientName: string;
  clientSubEntityName?: string;
  clientTrn?: string;
  invoiceAddress: string;
  deliveryAddress?: string;
  siteCode: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  currency?: string;
  lineItems: LpoLineItemValues[];
  updatedByUserId: string;
};

/**
 * Edits an LPO's client/commercial details and line items after creation —
 * real orders change (price renegotiated, quantity adjusted) between when
 * the LPO was entered and when a document actually gets generated off it.
 * Deliberately does NOT touch already-`GeneratedDocument`s: each one froze
 * its own snapshot at generation time, so an edit here never rewrites a
 * document that's already gone out. Line items are fully replaced rather
 * than diffed — simplest correct behavior for "re-enter the corrected list".
 */
export async function updateLpo(input: UpdateLpoInput) {
  const values = editLpoFormSchema.parse({
    nickname: input.nickname,
    clientName: input.clientName,
    clientSubEntityName: input.clientSubEntityName,
    clientTrn: input.clientTrn,
    invoiceAddress: input.invoiceAddress,
    deliveryAddress: input.deliveryAddress,
    siteCode: input.siteCode,
    paymentTerms: input.paymentTerms,
    deliveryTerms: input.deliveryTerms,
    currency: input.currency,
    lineItems: input.lineItems,
  });

  const existing = await prisma.lpo.findUnique({ where: { id: input.lpoId } });
  if (!existing) {
    throw new Error("LPO not found.");
  }

  const lineItemsWithTotals = values.lineItems.map((line, index) => ({
    position: index + 1,
    category: line.category?.trim() || null,
    description: line.description,
    articleNo: line.articleNo?.trim() || null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountPercent: line.discountPercent ?? 0,
    lineTotal: calculateLineTotal(line),
  }));

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lpo.update({
      where: { id: input.lpoId },
      data: {
        nickname: values.nickname,
        clientName: values.clientName,
        clientSubEntityName: values.clientSubEntityName?.trim() || null,
        clientTrn: values.clientTrn?.trim() || null,
        invoiceAddress: values.invoiceAddress,
        deliveryAddress: values.deliveryAddress?.trim() || null,
        siteCode: values.siteCode,
        paymentTerms: values.paymentTerms?.trim() || null,
        deliveryTerms: values.deliveryTerms?.trim() || null,
        currency: values.currency,
      },
    });

    await tx.lpoLineItem.deleteMany({ where: { lpoId: input.lpoId } });
    await tx.lpoLineItem.createMany({
      data: lineItemsWithTotals.map((line) => ({ ...line, lpoId: input.lpoId })),
    });

    await tx.auditLog.create({
      data: {
        entityType: "Lpo",
        entityId: input.lpoId,
        action: "LPO_DETAILS_UPDATED",
        actorId: input.updatedByUserId,
        payload: {
          lpoNumber: existing.lpoNumber,
          lineItemCount: lineItemsWithTotals.length,
        },
      },
    });

    return updated;
  });
}
