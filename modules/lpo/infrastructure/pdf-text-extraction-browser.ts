import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

import type { PdfLine, PdfToken } from "@/modules/lpo/infrastructure/pdf-text-extraction";

// Same-origin worker: the CSP only allows scripts from 'self'.
// scripts/copy-pdf-worker.mjs keeps this file in sync with the installed pdfjs-dist.
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Browser-build mirror of pdf-text-extraction.ts's `extractPdfLines`, so the
 * "Prefill from this PDF" parse runs client-side (no upload to a Server Action).
 * Separate from the Node module because that one needs the native @napi-rs/canvas
 * build, which must stay out of the client bundle.
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
