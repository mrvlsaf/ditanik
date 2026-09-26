import { upload } from "@vercel/blob/client";

import { BLOB_KEY_PREFIX } from "@/modules/files/domain/pdf-rules";

export { DIRECT_UPLOAD_THRESHOLD_BYTES } from "@/modules/files/domain/pdf-rules";

export type UploadedFileRef = {
  fileKey: string;
  fileName: string;
  mimeType: string;
};

/**
 * Uploads a PDF straight from the browser to Vercel Blob storage — bypassing
 * this app's own Server Actions for the large binary — and returns a small
 * reference the caller hands to the matching Server Action instead of the
 * raw file. See DIRECT_UPLOAD_THRESHOLD_BYTES for why this exists at all,
 * and app/api/blob-upload/route.ts for the server half of the handshake
 * (`upload()` here calls that route itself to get a scoped token; this
 * function never talks to it directly).
 *
 * Only call this when `isUsingBlobStorage` (threaded down from a Server
 * Component via get-file-storage.ts) is true — local dev's disk-backed
 * storage has no direct-upload endpoint for the browser to PUT to.
 */
export async function uploadPdfDirectToBlob(
  file: File,
  folder: string,
): Promise<UploadedFileRef> {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `${safeFolder}/${crypto.randomUUID()}-${safeName}`;

  await upload(`${BLOB_KEY_PREFIX}${fileKey}`, file, {
    access: "private",
    contentType: file.type || "application/pdf",
    handleUploadUrl: "/api/blob-upload",
    clientPayload: JSON.stringify({ folder: safeFolder }),
  });

  return { fileKey, fileName: file.name, mimeType: file.type || "application/pdf" };
}
