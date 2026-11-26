import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { BLOB_KEY_PREFIX } from "@/modules/files/domain/pdf-rules";

/**
 * Server half of the browser's direct-to-Blob upload (lib/direct-blob-upload.ts):
 * issues a short-lived scoped client token; the file bytes never pass through here.
 * No `onUploadCompleted`: the Server Action that follows commits to the database
 * (see readPdfUploadFromForm / FileStorage.adopt()).
 */
const ALLOWED_FOLDERS = new Set([
  "lpo-originals",
  "lpo-production",
  "fabric-invoices",
  "supplier-invoices",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        const session = await auth();
        if (!session?.user?.email) {
          throw new Error("You must be signed in.");
        }

        let folder = "";
        try {
          const parsed: unknown = clientPayloadRaw ? JSON.parse(clientPayloadRaw) : {};
          folder =
            parsed &&
            typeof parsed === "object" &&
            typeof (parsed as { folder?: unknown }).folder === "string"
              ? (parsed as { folder: string }).folder
              : "";
        } catch {
          throw new Error("Invalid upload request.");
        }

        if (
          !ALLOWED_FOLDERS.has(folder) ||
          !pathname.startsWith(`${BLOB_KEY_PREFIX}${folder}/`)
        ) {
          throw new Error("Invalid upload destination.");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: false,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
