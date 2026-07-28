import { assertPdfFile } from "@/modules/files/domain/pdf-rules";
import { getFileStorage } from "@/modules/files/infrastructure/get-file-storage";
import type { StoredFile } from "@/modules/files/infrastructure/file-storage";

export async function storePdfUpload(
  file: File,
  folder: string,
): Promise<StoredFile> {
  assertPdfFile(file);
  return getFileStorage().save({ file, folder });
}

export async function readStoredFile(fileKey: string) {
  return getFileStorage().read(fileKey);
}
