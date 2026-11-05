import { localFileStorage } from "@/modules/files/infrastructure/local-file-storage";
import { vercelBlobStorage } from "@/modules/files/infrastructure/vercel-blob-storage";
import type { FileStorage } from "@/modules/files/infrastructure/file-storage";

/**
 * Active storage backend. Vercel's serverless functions can't write to
 * local disk in production, so this uses Vercel Blob whenever a store is
 * linked (`BLOB_READ_WRITE_TOKEN` is set — Vercel sets it automatically),
 * and falls back to `uploads/` on local disk otherwise so `pnpm dev` needs
 * no extra setup. See the README's deploy checklist for connecting Blob.
 */
export function getFileStorage(): FileStorage {
  return process.env.BLOB_READ_WRITE_TOKEN ? vercelBlobStorage : localFileStorage;
}

/**
 * Server-only check of the SAME fact `getFileStorage()` branches on, for
 * Server Components to pass down to a client form as a plain boolean prop
 * (never the token itself) — the form uses it to decide whether a large
 * file can go straight to Blob from the browser (see
 * lib/direct-blob-upload.ts) or must fall back to the old through-the-
 * -action path, which only local disk storage's dev-only backend takes.
 */
export function isUsingBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
