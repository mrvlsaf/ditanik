import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfToken = { x: number; text: string };
export type PdfLine = { page: number; y: number; tokens: PdfToken[] };

/**
 * Extracts every page's text as position-grouped lines (tokens grouped by rounded
 * baseline y, sorted left-to-right), which rebuilds the visual layout regardless of
 * paint order. This is what `lpo-extraction.ts` parses.
 *
 * Uses pdfjs-dist's legacy Node build (no worker). `@napi-rs/canvas` is a real
 * dependency because that build needs it to polyfill DOMMatrix/Path2D/ImageData,
 * which some PDFs (embedded images, vector form fields) hit even for plain text.
 */
export async function extractPdfLines(bytes: Buffer): Promise<PdfLine[]> {
  const document = await getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
  }).promise;

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

  // Reading order: page, then top-to-bottom (PDF y points up).
  lines.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));
  return lines;
}
