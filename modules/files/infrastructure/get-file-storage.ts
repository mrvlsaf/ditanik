import { localFileStorage } from "@/modules/files/infrastructure/local-file-storage";
import type { FileStorage } from "@/modules/files/infrastructure/file-storage";

/** Active storage backend (local uploads; swap later for Blob/S3). */
export function getFileStorage(): FileStorage {
  return localFileStorage;
}
