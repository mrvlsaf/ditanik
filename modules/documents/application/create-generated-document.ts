import { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/modules/company/application/company-profile";
import { allocateDocumentSequence } from "@/modules/documents/application/document-sequence";
import { formatDocumentNumber } from "@/modules/documents/domain/document-numbering";
import {
  calculateQuotationValidityDate,
  DEFAULT_QUOTATION_TERMS,
  parseTermsText,
} from "@/modules/documents/domain/quotation-terms";
import {
  buildDeliveryNoteWorkbook,
  type DeliveryNoteLineItemRow,
} from "@/modules/documents/infrastructure/delivery-note-workbook";
import {
  buildQuotationWorkbook,
  type QuotationLineItemRow,
} from "@/modules/documents/infrastructure/quotation-workbook";
import {
  buildInvoiceWorkbook,
  type InvoiceLineItemRow,
} from "@/modules/documents/infrastructure/tax-invoice-workbook";
import { storeGeneratedFile } from "@/modules/files/application/store-generated-file";
import {
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateVatAmount,
  DEFAULT_VAT_PERCENT,
} from "@/modules/lpo/domain/line-items";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Default delivery-note type — confirmed on every real example seen so far. */
export const DEFAULT_DELIVERY_NOTE_TYPE = "Job work";

export type DocumentClientDetails = {
  clientName: string;
  clientSubEntityName: string | null;
  clientTrn: string | null;
  /** Invoice address for quotations/invoices, delivery address for delivery notes. */
  address: string;
};

type CreateGeneratedDocumentBase = {
  generatedByUserId: string;
  siteCode: string;
  client: DocumentClientDetails;
  /**
   * The LPO this document belongs to, with the frozen LPO block stored in the
   * snapshot. `null` for independent documents (generated without an LPO).
   */
  lpo: { id: string; snapshot: Record<string, unknown> } | null;
  /** Injectable for tests; defaults to now. */
  generatedAt?: Date;
};

export type CreateGeneratedDocumentInput = CreateGeneratedDocumentBase &
  (
    | { type: "QUOTATION"; lineItems: QuotationLineItemRow[] }
    | {
        type: "TAX_INVOICE";
        lineItems: InvoiceLineItemRow[];
        /** Printed in the LPO reference box; blank for independent invoices without one. */
        lpoReference: string;
      }
    | {
        type: "DELIVERY_NOTE";
        lineItems: DeliveryNoteLineItemRow[];
        lpoReference: string;
        notes: string | null;
        noteType?: string;
        dispatchDate?: Date;
      }
  );

/**
 * Shared back end of every document generator: numbers the document, fills the
 * Excel template, stores the file and records the GeneratedDocument row with a
 * frozen snapshot. The LPO-bound generators and the independent-document form
 * both go through here, so the two paths can never drift apart.
 */
export async function createGeneratedDocument(input: CreateGeneratedDocumentInput) {
  const companyProfile = await getCompanyProfile();
  if (!companyProfile) {
    throw new Error(
      "Set up the Company profile (Settings → Company profile) before generating documents.",
    );
  }

  const subtotal = calculateLineItemsSubtotal(input.lineItems);
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);

  const generatedAt = input.generatedAt ?? new Date();

  // Atomic, race-safe: two people generating a document of the same type at
  // the same moment still get distinct sequence numbers.
  const documentType = DocumentType[input.type];
  const sequence = await allocateDocumentSequence(documentType, generatedAt);
  const documentNumber = formatDocumentNumber({
    siteCode: input.siteCode,
    type: documentType,
    generatedAt,
    sequence,
  });

  const company = {
    companyLegalName: companyProfile.legalName,
    companyTrn: companyProfile.trn,
    companyPhone: companyProfile.phone,
    companyEmail: companyProfile.email,
    companyWebsite: companyProfile.website,
    companyAddressLine1: companyProfile.addressLine1,
    companyAddressLine2: companyProfile.addressLine2,
  };
  const client = {
    clientTrn: input.client.clientTrn,
    clientSubEntityName: input.client.clientSubEntityName,
    clientName: input.client.clientName,
    invoiceAddress: input.client.address,
  };
  const totals = {
    subtotal,
    vatPercent: DEFAULT_VAT_PERCENT,
    vatAmount,
    grandTotal,
  };

  let workbook;
  let typeExtras: Record<string, unknown> = {};

  switch (input.type) {
    case "QUOTATION": {
      const validityDate = calculateQuotationValidityDate(generatedAt);
      const termsAndConditions = parseTermsText(companyProfile.defaultTermsText) ?? [
        ...DEFAULT_QUOTATION_TERMS,
      ];
      workbook = await buildQuotationWorkbook({
        ...company,
        ...client,
        ...totals,
        documentNumber,
        documentDate: generatedAt,
        validityDate,
        lineItems: input.lineItems,
        termsAndConditions,
      });
      typeExtras = {
        validityDate: validityDate.toISOString(),
        termsAndConditions,
      };
      break;
    }
    case "TAX_INVOICE": {
      workbook = await buildInvoiceWorkbook({
        ...company,
        ...client,
        ...totals,
        documentNumber,
        documentDate: generatedAt,
        lpoReference: input.lpoReference,
        lineItems: input.lineItems,
      });
      break;
    }
    case "DELIVERY_NOTE": {
      const notes = input.notes?.trim() || null;
      workbook = await buildDeliveryNoteWorkbook({
        ...company,
        ...client,
        ...totals,
        documentNumber,
        dispatchDate: input.dispatchDate ?? generatedAt,
        noteDate: generatedAt,
        noteType: input.noteType ?? DEFAULT_DELIVERY_NOTE_TYPE,
        lpoReference: input.lpoReference,
        notes,
        lineItems: input.lineItems,
      });
      typeExtras = { notes };
      break;
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const storedFile = await storeGeneratedFile({
    bytes: buffer,
    fileName: `${documentNumber}.xlsx`,
    mimeType: XLSX_MIME,
    folder: "generated-documents",
  });

  return prisma.generatedDocument.create({
    data: {
      type: documentType,
      documentNumber,
      lpoId: input.lpo?.id ?? null,
      clientName: input.client.clientName,
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
        // LPO-linked: the frozen LPO block, as before. Independent: no LPO —
        // the typed client details are frozen under `client` instead.
        lpo: input.lpo?.snapshot ?? null,
        client: {
          clientName: input.client.clientName,
          clientSubEntityName: input.client.clientSubEntityName,
          clientTrn: input.client.clientTrn,
          address: input.client.address,
          siteCode: input.siteCode,
        },
        ...typeExtras,
        lineItems: input.lineItems,
        subtotal,
        vatAmount,
        grandTotal,
      },
    },
  });
}
