import { randomUUID } from "node:crypto";

import { get, head, put } from "@vercel/blob";

import { BLOB_KEY_PREFIX } from "@/modules/files/domain/pdf-rules";
import type {
  FileStorage,
  StoredFile,
  StoredFileBytes,
} from "@/modules/files/infrastructure/file-storage";

/**
 * Production storage backend (Vercel's filesystem is read-only). Chosen by
 * `get-file-storage.ts` when `BLOB_READ_WRITE_TOKEN` is set, else local disk.
 * Files are stored private; downloads go through the authenticated `/api/files` route.
 */

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

  /**
   * The browser already uploaded this file directly (lib/direct-blob-upload.ts,
   * app/api/blob-upload/route.ts). This only confirms the blob exists before the
   * caller commits it to the database; nothing is re-uploaded.
   */
  async adopt({ fileKey, fileName, mimeType }): Promise<StoredFile> {
    if (!fileKey || fileKey.includes("..")) {
      throw new Error("Invalid file key.");
    }

    const metadata = await head(toBlobPath(fileKey));
    return {
      fileKey,
      fileName,
      mimeType: metadata.contentType || mimeType,
    };
  },

  async read(fileKey: string): Promise<StoredFileBytes> {
    if (!fileKey || fileKey.includes("..")) {
      throw new Error("Invalid file key.");
    }

    // `head()` + `fetch(url)` 403s on a private store; `get()` attaches the auth itself.
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
