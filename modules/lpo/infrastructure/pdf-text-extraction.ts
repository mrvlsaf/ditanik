import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfToken = { x: number; text: string };
export type PdfLine = { page: number; y: number; tokens: PdfToken[] };

/**
 * Extracts every page's text as position-grouped lines — tokens are grouped
 * by their rounded baseline y and sorted left-to-right within a line, which
 * reconstructs the document's visual layout (columns, side-by-side blocks)
 * regardless of the order the PDF's content stream happens to paint them in.
 * This is what `modules/lpo/domain/lpo-extraction.ts`'s rule-based parser
 * reads — column position, not paint order, is what makes a fixed-layout LPO
 * parseable at all.
 *
 * Uses pdfjs-dist's legacy (non-worker) Node build — no `GlobalWorkerOptions`
 * setup needed, unlike `DocumentViewer`'s browser-side CDN worker.
 *
 * `@napi-rs/canvas` is a real dependency (not just pdfjs-dist's optional
 * peer) so this works in a serverless deployment, not only local dev:
 * pdfjs-dist's Node build uses it to polyfill browser-only APIs
 * (DOMMatrix, Path2D, ImageData) that some PDFs exercise even for plain
 * text extraction — e.g. one with embedded images or vector-drawn form
 * fields. Without it, those specific PDFs throw here instead of just
 * degrading, while a simpler text-only PDF can extract fine either way,
 * which is what made this gap easy to miss in testing.
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

  // Reading order: page, then top-to-bottom (descending y — PDF's y axis
  // points up) within a page.
  lines.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));
  return lines;
}
