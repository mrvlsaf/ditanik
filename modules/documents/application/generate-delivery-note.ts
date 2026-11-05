import { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/modules/company/application/company-profile";
import { allocateDocumentSequence } from "@/modules/documents/application/document-sequence";
import { formatDocumentNumber } from "@/modules/documents/domain/document-numbering";
import {
  buildDeliveryNoteWorkbook,
  type DeliveryNoteLineItemRow,
} from "@/modules/documents/infrastructure/delivery-note-workbook";
import { storeGeneratedFile } from "@/modules/files/application/store-generated-file";
import {
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateVatAmount,
  DEFAULT_VAT_PERCENT,
} from "@/modules/lpo/domain/line-items";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Default note type — confirmed on every real example seen so far; verify it still holds if a new delivery-note pattern shows up. */
const DEFAULT_NOTE_TYPE = "Job work";

export type GenerateDeliveryNoteInput = {
  lpoId: string;
  generatedByUserId: string;
  notes?: string | null;
};

export async function generateDeliveryNoteDocument(
  input: GenerateDeliveryNoteInput,
) {
  const lpo = await prisma.lpo.findUnique({
    where: { id: input.lpoId },
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

  const companyProfile = await getCompanyProfile();
  if (!companyProfile) {
    throw new Error(
      "Set up the Company profile (Settings → Company profile) before generating documents.",
    );
  }

  const lineItems: DeliveryNoteLineItemRow[] = lpo.lineItems.map((line) => ({
    position: line.position,
    description: line.description,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
  }));

  const subtotal = calculateLineItemsSubtotal(lineItems);
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);

  const generatedAt = new Date();

  const sequence = await allocateDocumentSequence(
    DocumentType.DELIVERY_NOTE,
    generatedAt,
  );
  const documentNumber = formatDocumentNumber({
    siteCode: lpo.siteCode,
    type: DocumentType.DELIVERY_NOTE,
    generatedAt,
    sequence,
  });

  const notes = input.notes?.trim() || null;

  const workbook = await buildDeliveryNoteWorkbook({
    companyTrn: companyProfile.trn,
    companyPhone: companyProfile.phone,
    companyEmail: companyProfile.email,
    companyWebsite: companyProfile.website,
    companyAddressLine1: companyProfile.addressLine1,
    companyAddressLine2: companyProfile.addressLine2,
    documentNumber,
    dispatchDate: generatedAt,
    noteDate: generatedAt,
    noteType: DEFAULT_NOTE_TYPE,
    lpoReference: lpo.lpoNumber,
    clientTrn: lpo.clientTrn,
    clientSubEntityName: lpo.clientSubEntityName,
    clientName: lpo.clientName,
    invoiceAddress: lpo.deliveryAddress ?? lpo.invoiceAddress,
    notes,
    lineItems,
    subtotal,
    vatPercent: DEFAULT_VAT_PERCENT,
    vatAmount,
    grandTotal,
  });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const fileName = `${documentNumber}.xlsx`;
  const storedFile = await storeGeneratedFile({
    bytes: buffer,
    fileName,
    mimeType: XLSX_MIME,
    folder: "generated-documents",
  });

  const generatedDocument = await prisma.generatedDocument.create({
    data: {
      type: DocumentType.DELIVERY_NOTE,
      documentNumber,
      lpoId: lpo.id,
      fileKey: storedFile.fileKey,
      fileName: storedFile.fileName,
      mimeType: storedFile.mimeType,
      generatedById: input.generatedByUserId,
      snapshot: {
        companyProfile: {
          legalName: companyProfile.legalName,
          trn: companyProfile.trn,
          phone: companyProfile.phone,
          email: companyProfile.email,
          website: companyProfile.website,
          addressLine1: companyProfile.addressLine1,
          addressLine2: companyProfile.addressLine2,
        },
        lpo: {
          lpoNumber: lpo.lpoNumber,
          clientName: lpo.clientName,
          clientSubEntityName: lpo.clientSubEntityName,
          clientTrn: lpo.clientTrn,
          invoiceAddress: lpo.deliveryAddress ?? lpo.invoiceAddress,
          siteCode: lpo.siteCode,
          currency: lpo.currency,
        },
        notes,
        lineItems,
        subtotal,
        vatAmount,
        grandTotal,
      },
    },
  });

  return generatedDocument;
}
