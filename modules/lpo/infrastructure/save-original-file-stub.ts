import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Saves the original LPO file locally for Step 7 (cloud storage in Step 8). */
export async function saveOriginalLpoFileStub(
  file: File,
): Promise<{ fileKey: string; fileName: string; mimeType: string }> {
  const mimeType = file.type || "application/octet-stream";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `stub/lpo-originals/${randomUUID()}-${safeName}`;
  const absolutePath = path.join(process.cwd(), "uploads", fileKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    fileKey,
    fileName: file.name,
    mimeType,
  };
}
