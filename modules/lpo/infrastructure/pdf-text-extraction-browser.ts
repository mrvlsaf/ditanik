import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

import type { PdfLine, PdfToken } from "@/modules/lpo/infrastructure/pdf-text-extraction";

// Same-origin worker, same reasoning as DocumentViewer.tsx: the app's CSP
// only allows scripts from 'self', so pdfjs-dist's documented CDN default
// would get silently blocked. scripts/copy-pdf-worker.mjs keeps this file
// in sync with whichever pdfjs-dist version is installed.
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Browser-build mirror of pdf-text-extraction.ts's `extractPdfLines`, for
 * running the "Prefill from this PDF" parse entirely client-side (see
 * CreateLpoForm.tsx's handlePrefillFromPdf) instead of shipping the file to
 * a Server Action just to read it back apart — that round trip served no
 * purpose (nothing is stored during extraction) and cost the same
 * Vercel Serverless Function payload cap every other upload in this app
 * hits on a large file. `extractLpoData` (modules/lpo/domain/lpo-extraction.ts)
 * is a pure function over `PdfLine[]` with no server-only dependencies, so
 * the exact same parser runs unchanged on whichever line-extraction this
 * produces.
 *
 * Kept as a separate module from pdf-text-extraction.ts rather than a
 * shared implementation: that file deliberately uses pdfjs-dist's Node
 * "legacy" build (needs @napi-rs/canvas, no GlobalWorkerOptions), which
 * would drag a large native-dependent module into the client bundle if
 * imported from here.
 */
export async function extractPdfLinesInBrowser(file: File): Promise<PdfLine[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await getDocument({ data: bytes }).promise;

  const lines: PdfLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();

    const byY = new Map<number, PdfToken[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const tokens = byY.get(y) ?? [];
      tokens.push({ x, text: item.str });
      byY.set(y, tokens);
    }

    for (const [y, tokens] of byY) {
      lines.push({
        page: pageNumber,
        y,
        tokens: [...tokens].sort((a, b) => a.x - b.x),
      });
    }
  }

  lines.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));
  return lines;
}
