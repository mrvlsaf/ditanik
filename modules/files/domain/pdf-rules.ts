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

/**
 * Shared between the server (vercel-blob-storage.ts, app/api/blob-upload)
 * and the browser (lib/direct-blob-upload.ts) so both sides always agree on
 * where an upload lands — this file has no server-only imports, so it's
 * safe to import from a client component too.
 */
export const BLOB_KEY_PREFIX = "ditanik/";

/**
 * Above this size, a PDF is uploaded straight from the browser to Blob
 * storage instead of through a Server Action — Vercel hard-caps a
 * Serverless Function's request body (which a Server Action call is, under
 * the hood) at 4.5MB, non-configurably, regardless of this app's own
 * `experimental.serverActions.bodySizeLimit` in next.config.ts. A file over
 * that line sent the old way fails with FUNCTION_PAYLOAD_TOO_LARGE before
 * the action even runs. Comfortably under 4.5MB to leave room for
 * multipart/form-data overhead and the rest of the form's own fields.
 */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 3.5 * 1024 * 1024;
