import { createGeneratedDocument } from "@/modules/documents/application/create-generated-document";
import { loadLpoForDocument } from "@/modules/documents/application/load-lpo-for-document";
import { type DeliveryNoteLineItemRow } from "@/modules/documents/infrastructure/delivery-note-workbook";

export type GenerateDeliveryNoteInput = {
  lpoId: string;
  generatedByUserId: string;
  notes?: string | null;
};

export async function generateDeliveryNoteDocument(input: GenerateDeliveryNoteInput) {
  const lpo = await loadLpoForDocument(input.lpoId);

  const lineItems: DeliveryNoteLineItemRow[] = lpo.lineItems.map((line) => ({
    position: line.position,
    description: line.description,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
  }));

  // A delivery note goes to the delivery address when the LPO has one.
  const address = lpo.deliveryAddress ?? lpo.invoiceAddress;

  return createGeneratedDocument({
    type: "DELIVERY_NOTE",
    generatedByUserId: input.generatedByUserId,
    siteCode: lpo.siteCode,
    client: {
      clientName: lpo.clientName,
      clientSubEntityName: lpo.clientSubEntityName,
      clientTrn: lpo.clientTrn,
      address,
    },
    lpo: {
      id: lpo.id,
      snapshot: { ...lpo.snapshot, invoiceAddress: address },
    },
    lpoReference: lpo.lpoNumber,
    notes: input.notes?.trim() || null,
    lineItems,
  });
}
