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

/**
 * Shared by the server and the browser (no server-only imports) so both agree
 * on where an upload lands.
 */
export const BLOB_KEY_PREFIX = "ditanik/";

/**
 * Above this size a PDF goes straight from the browser to Blob storage: Vercel
 * caps a Server Action request body at 4.5MB regardless of
 * `serverActions.bodySizeLimit`. Kept under that to leave room for multipart overhead.
 */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 3.5 * 1024 * 1024;
