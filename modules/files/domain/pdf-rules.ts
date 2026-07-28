const PDF_MIME = "application/pdf";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Ensures upload is a PDF within size limits. */
export function assertPdfFile(file: File): void {
  const name = file.name.toLowerCase();
  const isPdfMime = file.type === PDF_MIME || file.type === "";
  const isPdfName = name.endsWith(".pdf");

  if (!isPdfMime || !isPdfName) {
    throw new Error("Only PDF files are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("PDF file is empty.");
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF must be 25MB or smaller.");
  }
}

export const ALLOWED_PDF_ACCEPT = "application/pdf,.pdf";
