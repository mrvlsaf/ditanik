import { prisma } from "@/lib/db";
import { convertOfficeFileToPdf } from "@/modules/documents/infrastructure/pdf-conversion";
import { readStoredFile } from "@/modules/files/application/store-pdf";
import { storeGeneratedFile } from "@/modules/files/application/store-generated-file";

const PDF_MIME = "application/pdf";

/** Converts a previously generated Excel document to PDF — idempotent, converts once. */
export async function convertGeneratedDocumentToPdf(generatedDocumentId: string) {
  const document = await prisma.generatedDocument.findUnique({
    where: { id: generatedDocumentId },
  });
  if (!document) {
    throw new Error("Generated document not found.");
  }

  if (document.pdfFileKey) {
    return document;
  }

  const stored = await readStoredFile(document.fileKey);
  const pdfBytes = await convertOfficeFileToPdf(stored.bytes, stored.fileName);

  const pdfFileName = document.fileName.replace(/\.xlsx$/i, ".pdf");
  const storedPdf = await storeGeneratedFile({
    bytes: pdfBytes,
    fileName: pdfFileName,
    mimeType: PDF_MIME,
    folder: "generated-documents",
  });

  return prisma.generatedDocument.update({
    where: { id: document.id },
    data: {
      pdfFileKey: storedPdf.fileKey,
      pdfFileName: storedPdf.fileName,
    },
  });
}
