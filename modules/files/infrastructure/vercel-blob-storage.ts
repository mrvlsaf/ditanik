import { randomUUID } from "node:crypto";

import { get, put } from "@vercel/blob";

import type {
  FileStorage,
  StoredFile,
  StoredFileBytes,
} from "@/modules/files/infrastructure/file-storage";

/**
 * Production storage backend — Vercel's serverless functions run on a
 * read-only, ephemeral filesystem, so `local-file-storage.ts`'s
 * `uploads/` folder on disk (fine for `pnpm dev`) silently loses every
 * upload and generated document once deployed. This talks to Vercel Blob
 * instead over its SDK; `get-file-storage.ts` picks this backend whenever
 * `BLOB_READ_WRITE_TOKEN` is set (which Vercel sets automatically once a
 * Blob store is linked to the project — see infra/gotenberg-style setup in
 * the deploy checklist) and falls back to local disk otherwise, so local
 * dev needs no extra setup.
 *
 * Files are stored **private** (`access: "private"`) — every download still
 * goes through the app's own authenticated `/api/files` route, matching how
 * local storage already works, rather than handing out public Blob URLs.
 */

const BLOB_KEY_PREFIX = "ditanik/";

function toBlobPath(fileKey: string): string {
  return `${BLOB_KEY_PREFIX}${fileKey}`;
}

/** The `fileKey` this app hands around everywhere is the blob path with the fixed prefix stripped. */
function fromBlobPath(pathname: string): string {
  return pathname.startsWith(BLOB_KEY_PREFIX)
    ? pathname.slice(BLOB_KEY_PREFIX.length)
    : pathname;
}

export const vercelBlobStorage: FileStorage = {
  async save({ file, folder }): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `${safeFolder}/${randomUUID()}-${safeName}`;

    const blob = await put(toBlobPath(fileKey), file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || "application/pdf",
    });

    return {
      fileKey: fromBlobPath(blob.pathname),
      fileName: file.name,
      mimeType: file.type || "application/pdf",
    };
  },

  async saveBuffer({ bytes, fileName, mimeType, folder }): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `${safeFolder}/${randomUUID()}-${safeName}`;

    const blob = await put(toBlobPath(fileKey), bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: mimeType,
    });

    return {
      fileKey: fromBlobPath(blob.pathname),
      fileName,
      mimeType,
    };
  },

  async read(fileKey: string): Promise<StoredFileBytes> {
    if (!fileKey || fileKey.includes("..")) {
      throw new Error("Invalid file key.");
    }

    // `head()` + a bare `fetch(metadata.url)` looked reasonable but silently
    // 403'd: this store is private, and a private blob's content URL still
    // requires the same auth as everything else in this SDK — `head()`
    // never carries that over into the plain URL it returns. `get()` is the
    // SDK's own helper for reading blob content and attaches that auth
    // itself, so it's what actually works here.
    const blobPath = toBlobPath(fileKey);
    const result = await get(blobPath, { access: "private" });
    if (!result || result.statusCode !== 200) {
      throw new Error(`Could not read stored file "${fileKey}".`);
    }

    const fileName =
      fileKey
        .split("/")
        .pop()
        ?.replace(/^[0-9a-f-]+-/i, "") ?? fileKey;

    return {
      bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
      fileName,
      mimeType: result.blob.contentType || "application/octet-stream",
    };
  },
};
