import { localFileStorage } from "@/modules/files/infrastructure/local-file-storage";
import { vercelBlobStorage } from "@/modules/files/infrastructure/vercel-blob-storage";
import type { FileStorage } from "@/modules/files/infrastructure/file-storage";

/**
 * Active storage backend: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set,
 * otherwise `uploads/` on local disk.
 */
export function getFileStorage(): FileStorage {
  return process.env.BLOB_READ_WRITE_TOKEN ? vercelBlobStorage : localFileStorage;
}

/**
 * Server-only check of the fact `getFileStorage()` branches on, passed to client
 * forms as a boolean (never the token) so they know whether large files can go
 * straight to Blob.
 */
export function isUsingBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
