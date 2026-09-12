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
      OR: [{ originalFileKey: fileKey }, { productionFileKey: fileKey }],
    },
    select: {
      originalFileName: true,
      productionFileName: true,
      originalFileKey: true,
    },
  });

  const invoice = lpo
    ? null
    : await prisma.fabricSupplierInvoice.findFirst({
        where: { invoiceFileKey: fileKey },
        select: { invoiceFileName: true },
      });

  const generatedDocument =
    lpo || invoice
      ? null
      : await prisma.generatedDocument.findFirst({
          where: { OR: [{ fileKey }, { pdfFileKey: fileKey }] },
          select: { fileName: true, fileKey: true, pdfFileName: true, pdfFileKey: true },
        });

  if (!lpo && !invoice && !generatedDocument) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const stored = await readStoredFile(fileKey);
    const generatedDocumentName =
      generatedDocument?.pdfFileKey === fileKey
        ? generatedDocument.pdfFileName
        : generatedDocument?.fileName;

    const fileName = lpo
      ? fileKey === lpo.originalFileKey
        ? lpo.originalFileName
        : (lpo.productionFileName ?? stored.fileName)
      : (invoice?.invoiceFileName ?? generatedDocumentName ?? stored.fileName);

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
