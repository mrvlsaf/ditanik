import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { BLOB_KEY_PREFIX } from "@/modules/files/domain/pdf-rules";

/**
 * Server half of the browser's direct-to-Blob upload (see
 * lib/direct-blob-upload.ts for why this exists — Vercel's Serverless
 * Function payload cap). The browser calls `upload()` from
 * `@vercel/blob/client`, which POSTs here first to get a short-lived,
 * scoped client token before it PUTs the actual file straight to Blob
 * storage; this route never sees the file's bytes.
 *
 * `onUploadCompleted` is intentionally omitted: nothing here needs to react
 * to the browser's PUT finishing, because the Server Action that follows it
 * (with the resulting file reference in the form) is what commits anything
 * to the database — see readPdfUploadFromForm / FileStorage.adopt().
 */
const ALLOWED_FOLDERS = new Set(["lpo-originals", "lpo-production", "fabric-invoices"]);
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
