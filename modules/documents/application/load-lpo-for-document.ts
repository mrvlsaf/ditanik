import { prisma } from "@/lib/db";

/**
 * Loads an LPO and enforces the "ready to document" rules shared by the LPO-bound
 * generators (site code, invoice address, at least one line item). Returns the typed
 * fields plus the frozen `lpo` snapshot block.
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
