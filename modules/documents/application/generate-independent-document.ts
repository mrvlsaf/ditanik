import {
  createGeneratedDocument,
  type DocumentClientDetails,
} from "@/modules/documents/application/create-generated-document";
import {
  independentDocumentSchema,
  toIndependentLineRows,
} from "@/modules/documents/domain/independent-document";

export type GenerateIndependentDocumentInput = {
  /** Raw, untrusted form values — validated here. */
  values: unknown;
  generatedByUserId: string;
};

/**
 * Generates a Quotation / Tax Invoice / Delivery Note that is not tied to any
 * LPO. Same numbering counter, templates and storage as LPO-linked documents;
 * the only difference is where the client details and lines come from.
 */
export async function generateIndependentDocument(
  input: GenerateIndependentDocumentInput,
) {
  const parsed = independentDocumentSchema.safeParse(input.values);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid document details.");
  }
  const values = parsed.data;

  const rows = toIndependentLineRows(values.lineItems);
  const client: DocumentClientDetails = {
    clientName: values.clientName,
    clientSubEntityName: values.clientSubEntityName || null,
    clientTrn: values.clientTrn || null,
    address: values.address,
  };
  // Tax invoices and delivery notes have no category column.
  const plainRows = rows.map((line) => ({
    position: line.position,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));
  const base = {
    generatedByUserId: input.generatedByUserId,
    siteCode: values.siteCode,
    client,
    lpo: null,
  };
  const lpoReference = values.lpoReference || "";

  switch (values.type) {
    case "QUOTATION":
      return createGeneratedDocument({ ...base, type: "QUOTATION", lineItems: rows });
    case "TAX_INVOICE":
      return createGeneratedDocument({
        ...base,
        type: "TAX_INVOICE",
        lpoReference,
        lineItems: plainRows,
      });
    case "DELIVERY_NOTE":
      return createGeneratedDocument({
        ...base,
        type: "DELIVERY_NOTE",
        lpoReference,
        notes: values.notes || null,
        noteType: values.noteType || undefined,
        dispatchDate: values.dispatchDate
          ? new Date(`${values.dispatchDate}T00:00:00.000Z`)
          : undefined,
        lineItems: plainRows,
      });
  }
}
