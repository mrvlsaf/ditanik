import { createGeneratedDocument } from "@/modules/documents/application/create-generated-document";
import { loadLpoForDocument } from "@/modules/documents/application/load-lpo-for-document";
import { type QuotationLineItemRow } from "@/modules/documents/infrastructure/quotation-workbook";
import { roundCurrency } from "@/modules/lpo/domain/line-items";

export type GenerateQuotationInput = {
  lpoId: string;
  generatedByUserId: string;
};

export async function generateQuotationDocument(input: GenerateQuotationInput) {
  const lpo = await loadLpoForDocument(input.lpoId);

  // AMOUNT PER UNIT is the price after any line discount, so it always
  // agrees with the (already discounted) line total.
  const lineItems: QuotationLineItemRow[] = lpo.lineItems.map((line) => ({
    position: line.position,
    category: line.category,
    description: line.description,
    quantity: line.quantity,
    unitPrice: roundCurrency(
      Number(line.unitPrice) * (1 - Number(line.discountPercent) / 100),
    ),
    lineTotal: Number(line.lineTotal),
  }));

  return createGeneratedDocument({
    type: "QUOTATION",
    generatedByUserId: input.generatedByUserId,
    siteCode: lpo.siteCode,
    client: {
      clientName: lpo.clientName,
      clientSubEntityName: lpo.clientSubEntityName,
      clientTrn: lpo.clientTrn,
      address: lpo.invoiceAddress,
    },
    lpo: { id: lpo.id, snapshot: lpo.snapshot },
    lineItems,
  });
}
