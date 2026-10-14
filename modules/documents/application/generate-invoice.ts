import { createGeneratedDocument } from "@/modules/documents/application/create-generated-document";
import { loadLpoForDocument } from "@/modules/documents/application/load-lpo-for-document";
import { type InvoiceLineItemRow } from "@/modules/documents/infrastructure/tax-invoice-workbook";

export type GenerateInvoiceInput = {
  lpoId: string;
  generatedByUserId: string;
};

export async function generateInvoiceDocument(input: GenerateInvoiceInput) {
  const lpo = await loadLpoForDocument(input.lpoId);

  const lineItems: InvoiceLineItemRow[] = lpo.lineItems.map((line) => ({
    position: line.position,
    description: line.description,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
  }));

  return createGeneratedDocument({
    type: "TAX_INVOICE",
    generatedByUserId: input.generatedByUserId,
    siteCode: lpo.siteCode,
    client: {
      clientName: lpo.clientName,
      clientSubEntityName: lpo.clientSubEntityName,
      clientTrn: lpo.clientTrn,
      address: lpo.invoiceAddress,
    },
    lpo: { id: lpo.id, snapshot: lpo.snapshot },
    lpoReference: lpo.lpoNumber,
    lineItems,
  });
}
