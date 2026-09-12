import { auth } from "@/auth";
import { convertOfficeFileToPdf } from "@/modules/documents/infrastructure/pdf-conversion";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".ods"];

/**
 * Standalone "browse and convert" flow — accepts a hand-edited Excel file
 * (the exact re-upload-and-convert flow from docs/DOCUMENT-GENERATION-PLAN.md
 * §4) with no LPO context and no stored history, and streams the converted
 * PDF straight back as the response. A plain HTML file-upload form can POST
 * here directly; the browser handles the resulting download on its own.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return new Response("Attach a file to convert.", { status: 400 });
  }

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );
  if (!hasAllowedExtension) {
    return new Response(
      `Unsupported file type — expected one of: ${ALLOWED_EXTENSIONS.join(", ")}`,
      { status: 400 },
    );
  }

  const MAX_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return new Response("File is too large (max 25MB).", { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdfBytes = await convertOfficeFileToPdf(bytes, file.name);
    const pdfFileName = file.name.replace(/\.[^.]+$/, "") + ".pdf";

    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Conversion failed.";
    return new Response(message, { status: 502 });
  }
}
