import { assertPdfFile } from "@/modules/files/domain/pdf-rules";
import { getFileStorage } from "@/modules/files/infrastructure/get-file-storage";
import type {
  StoredFile,
  UploadedFileRef,
} from "@/modules/files/infrastructure/file-storage";

export type { UploadedFileRef } from "@/modules/files/infrastructure/file-storage";

/**
 * Stores a user-uploaded PDF. `input` is either the raw `File` (the normal
 * path, still how every small upload works) or an `UploadedFileRef` the
 * browser already PUT directly to Blob storage before calling the Server
 * Action (see lib/direct-blob-upload.ts) — used for files too large to fit
 * through the action's own request body without hitting Vercel's
 * non-configurable 4.5MB Serverless Function payload cap.
 */
export async function storePdfUpload(
  input: File | UploadedFileRef,
  folder: string,
): Promise<StoredFile> {
  if (input instanceof File) {
    assertPdfFile(input);
    return getFileStorage().save({ file: input, folder });
  }

  if (!input.fileKey.startsWith(`${folder}/`)) {
    throw new Error("Uploaded file does not match the expected destination.");
  }
  return getFileStorage().adopt(input);
}

export async function readStoredFile(fileKey: string) {
  return getFileStorage().read(fileKey);
}

/**
 * Reads a PDF upload from a Server Action's FormData — either the raw
 * `File` under `fileField` (small-upload path, form-submitted the normal
 * way) or a JSON-encoded `UploadedFileRef` under `fileRefField` (large-file
 * path: the browser already uploaded it directly to Blob and the form only
 * carries the small reference — see lib/direct-blob-upload.ts). Returns
 * `null` when neither is present so the caller can produce its own "file is
 * required" message.
 */
export function readPdfUploadFromForm(
  formData: FormData,
  fileField: string,
  fileRefField: string,
): File | UploadedFileRef | null {
  const fileValue = formData.get(fileField);
  if (fileValue instanceof File && fileValue.size > 0) {
    return fileValue;
  }

  const refValue = formData.get(fileRefField);
  if (typeof refValue === "string" && refValue) {
    try {
      const parsed = JSON.parse(refValue) as Partial<UploadedFileRef>;
      if (
        typeof parsed.fileKey === "string" &&
        typeof parsed.fileName === "string" &&
        typeof parsed.mimeType === "string"
      ) {
        return {
          fileKey: parsed.fileKey,
          fileName: parsed.fileName,
          mimeType: parsed.mimeType,
        };
      }
    } catch {
      // Falls through to null below — treated the same as "no file given".
    }
  }

  return null;
}
