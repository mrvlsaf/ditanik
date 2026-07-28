import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/modules/files/application/store-pdf";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const fileKey = url.searchParams.get("key");
  const asDownload = url.searchParams.get("download") === "1";

  if (!fileKey) {
    return new Response("Missing file key", { status: 400 });
  }

  const lpo = await prisma.lpo.findFirst({
    where: {
      OR: [{ originalFileKey: fileKey }, { reviewFileKey: fileKey }],
    },
    select: { id: true, originalFileName: true, reviewFileName: true, originalFileKey: true },
  });

  if (!lpo) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const stored = await readStoredFile(fileKey);
    const fileName =
      fileKey === lpo.originalFileKey
        ? lpo.originalFileName
        : (lpo.reviewFileName ?? stored.fileName);

    const dispositionType = asDownload ? "attachment" : "inline";
    return new Response(new Uint8Array(stored.bytes), {
      status: 200,
      headers: {
        "Content-Type": stored.mimeType,
        "Content-Disposition": `${dispositionType}; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
