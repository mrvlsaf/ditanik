import { localFileStorage } from "@/modules/files/infrastructure/local-file-storage";
import { vercelBlobStorage } from "@/modules/files/infrastructure/vercel-blob-storage";
import type { FileStorage } from "@/modules/files/infrastructure/file-storage";

/**
 * Active storage backend. Vercel's serverless functions can't write to
 * local disk in production, so this uses Vercel Blob whenever a store is
 * linked (`BLOB_READ_WRITE_TOKEN` is set — Vercel sets it automatically),
 * and falls back to `uploads/` on local disk otherwise so `pnpm dev` needs
 * no extra setup. See docs/DOCUMENT-GENERATION-PLAN.md's deploy checklist.
 */
export function getFileStorage(): FileStorage {
  return process.env.BLOB_READ_WRITE_TOKEN ? vercelBlobStorage : localFileStorage;
}
