import { assertPdfFile } from "@/modules/files/domain/pdf-rules";
import { getFileStorage } from "@/modules/files/infrastructure/get-file-storage";
import type {
  StoredFile,
  UploadedFileRef,
} from "@/modules/files/infrastructure/file-storage";

export type { UploadedFileRef } from "@/modules/files/infrastructure/file-storage";

/**
 * Stores a user-uploaded PDF. `input` is the raw `File` or an `UploadedFileRef`
 * the browser already uploaded to Blob (lib/direct-blob-upload.ts; avoids
 * Vercel's 4.5MB request cap).
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
 * Reads a PDF from FormData: the raw `File` under `fileField`, or a JSON
 * `UploadedFileRef` under `fileRefField` (large-file path). Returns `null` when
 * neither is present.
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
      // Treated as "no file given".
    }
  }

  return null;
}
