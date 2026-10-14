import { prisma } from "@/lib/db";

/**
 * Loads an LPO and enforces the "ready to document" rules shared by every
 * LPO-bound generator (site code, invoice address and at least one line item).
 * Returns the typed fields the generators need plus the frozen `lpo` snapshot
 * block stored with each generated document.
 */
export async function loadLpoForDocument(lpoId: string) {
  const lpo = await prisma.lpo.findUnique({
    where: { id: lpoId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });

  if (!lpo) {
    throw new Error("LPO not found.");
  }
  if (!lpo.siteCode) {
    throw new Error(
      "This LPO has no site code yet — add one on the LPO before generating documents.",
    );
  }
  if (!lpo.invoiceAddress) {
    throw new Error(
      "This LPO has no invoice address yet — add client details before generating documents.",
    );
  }
  if (lpo.lineItems.length === 0) {
    throw new Error(
      "This LPO has no line items yet — add at least one before generating documents.",
    );
  }

  return {
    ...lpo,
    siteCode: lpo.siteCode,
    invoiceAddress: lpo.invoiceAddress,
    snapshot: {
      lpoNumber: lpo.lpoNumber,
      clientName: lpo.clientName,
      clientSubEntityName: lpo.clientSubEntityName,
      clientTrn: lpo.clientTrn,
      invoiceAddress: lpo.invoiceAddress,
      siteCode: lpo.siteCode,
      currency: lpo.currency,
    } as Record<string, unknown>,
  };
}
