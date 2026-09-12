import { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/modules/company/application/company-profile";
import { allocateDocumentSequence } from "@/modules/documents/application/document-sequence";
import { formatDocumentNumber } from "@/modules/documents/domain/document-numbering";
import {
  buildQuoteWorkbook,
  type QuoteLineItemRow,
} from "@/modules/documents/infrastructure/quote-workbook";
import { storeGeneratedFile } from "@/modules/files/application/store-generated-file";
import {
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateVatAmount,
  DEFAULT_VAT_PERCENT,
  roundCurrency,
} from "@/modules/lpo/domain/line-items";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * CompanyProfile.defaultTermsText holds one Terms & Conditions point per
 * line. Returns null when unset (or blank) so the Quote template's own
 * static text is used instead — see buildQuoteWorkbook's doc comment.
 */
function parseTermsAndConditions(defaultTermsText: string | null): string[] | null {
  if (!defaultTermsText) return null;
  const points = defaultTermsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return points.length > 0 ? points : null;
}

export type GenerateQuoteInput = {
  lpoId: string;
  generatedByUserId: string;
};

export async function generateQuoteDocument(input: GenerateQuoteInput) {
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

  const lineItems: QuoteLineItemRow[] = lpo.lineItems.map((line) => {
    const originalUnitPrice = Number(line.unitPrice);
    const discountPercent = Number(line.discountPercent);
    const revisedUnitPrice = roundCurrency(
      originalUnitPrice * (1 - discountPercent / 100),
    );
    return {
      category: line.category,
      description: line.description,
      quantity: line.quantity,
      originalUnitPrice,
      discountPercent,
      revisedUnitPrice,
      revisedTotalPrice: Number(line.lineTotal),
    };
  });

  const subtotal = calculateLineItemsSubtotal(
    lineItems.map((line) => ({ lineTotal: line.revisedTotalPrice })),
  );
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);

  const generatedAt = new Date();

  const sequence = await allocateDocumentSequence(
    DocumentType.QUOTE,
    generatedAt,
  );
  const documentNumber = formatDocumentNumber({
    siteCode: lpo.siteCode,
    type: DocumentType.QUOTE,
    generatedAt,
    sequence,
  });

  const workbook = await buildQuoteWorkbook({
    companyLegalName: companyProfile.legalName,
    companyTrn: companyProfile.trn,
    companyPhone: companyProfile.phone,
    companyEmail: companyProfile.email,
    companyWebsite: companyProfile.website,
    companyAddressLine1: companyProfile.addressLine1,
    companyAddressLine2: companyProfile.addressLine2,
    documentNumber,
    documentDate: generatedAt,
    clientTrn: lpo.clientTrn,
    clientSubEntityName: lpo.clientSubEntityName,
    clientName: lpo.clientName,
    invoiceAddress: lpo.invoiceAddress,
    lineItems,
    subtotal,
    vatPercent: DEFAULT_VAT_PERCENT,
    vatAmount,
    grandTotal,
    termsAndConditions: parseTermsAndConditions(companyProfile.defaultTermsText),
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
      type: DocumentType.QUOTE,
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
          invoiceAddress: lpo.invoiceAddress,
          siteCode: lpo.siteCode,
          currency: lpo.currency,
        },
        lineItems,
        subtotal,
        vatAmount,
        grandTotal,
      },
    },
  });

  return generatedDocument;
}
