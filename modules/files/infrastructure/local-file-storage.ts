import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  FileStorage,
  StoredFile,
  StoredFileBytes,
} from "@/modules/files/infrastructure/file-storage";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function assertSafeFileKey(fileKey: string): void {
  if (!fileKey || fileKey.includes("..") || path.isAbsolute(fileKey)) {
    throw new Error("Invalid file key.");
  }
}

/** Best-effort mimeType by extension — local storage keeps no separate metadata file. */
function mimeTypeFromFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

export const localFileStorage: FileStorage = {
  async save({ file, folder }): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `${safeFolder}/${randomUUID()}-${safeName}`;
    const absolutePath = path.join(UPLOAD_ROOT, fileKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    return {
      fileKey,
      fileName: file.name,
      mimeType: "application/pdf",
    };
  },

  async saveBuffer({ bytes, fileName, mimeType, folder }): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `${safeFolder}/${randomUUID()}-${safeName}`;
    const absolutePath = path.join(UPLOAD_ROOT, fileKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, bytes);

    return {
      fileKey,
      fileName,
      mimeType,
    };
  },

  async read(fileKey: string): Promise<StoredFileBytes> {
    assertSafeFileKey(fileKey);
    const absolutePath = path.join(UPLOAD_ROOT, fileKey);
    const bytes = await readFile(absolutePath);
    const fileName = path.basename(fileKey).replace(/^[0-9a-f-]+-/i, "");

    return {
      bytes,
      fileName,
      mimeType: mimeTypeFromFileName(fileName),
    };
  },
};
