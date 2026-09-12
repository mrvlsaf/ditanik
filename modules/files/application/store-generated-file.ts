import { getFileStorage } from "@/modules/files/infrastructure/get-file-storage";
import type { StoredFile } from "@/modules/files/infrastructure/file-storage";

/** Stores a server-generated file (e.g. a filled invoice workbook) — not a user upload. */
export async function storeGeneratedFile(input: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  folder: string;
}): Promise<StoredFile> {
  return getFileStorage().saveBuffer(input);
}
