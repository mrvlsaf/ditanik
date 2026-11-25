import { upload } from "@vercel/blob/client";

import { BLOB_KEY_PREFIX } from "@/modules/files/domain/pdf-rules";

export { DIRECT_UPLOAD_THRESHOLD_BYTES } from "@/modules/files/domain/pdf-rules";

export type UploadedFileRef = {
  fileKey: string;
  fileName: string;
  mimeType: string;
};

/**
 * Uploads a PDF straight from the browser to Vercel Blob and returns a small
 * reference for the matching Server Action (see DIRECT_UPLOAD_THRESHOLD_BYTES;
 * server half is app/api/blob-upload/route.ts). Only call when `isUsingBlobStorage`
 * is true; local disk storage has no direct-upload endpoint.
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
