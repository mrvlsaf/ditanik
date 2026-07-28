"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

type DocumentViewerProps = Readonly<{
  fileUrl: string;
  title: string;
  onClose: () => void;
}>;

/** In-app PDF viewer modal (PDF.js). */
export function DocumentViewer({ fileUrl, title, onClose }: DocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      setIsLoading(true);
      setError(null);

      try {
        const loadingTask = getDocument({ url: fileUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, canvas, viewport }).promise;
      } catch {
        if (!cancelled) {
          setError("Could not open this PDF.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, pageNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close document viewer"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-zinc-900 sm:text-base">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-md px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            className="min-h-9 rounded-md border border-zinc-200 px-3 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-zinc-600">
            {pageCount > 0 ? `${pageNumber} / ${pageCount}` : "—"}
          </span>
          <button
            type="button"
            disabled={pageCount === 0 || pageNumber >= pageCount}
            onClick={() =>
              setPageNumber((page) => Math.min(pageCount, page + 1))
            }
            className="min-h-9 rounded-md border border-zinc-200 px-3 disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="overflow-auto bg-zinc-100 p-3 sm:p-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-zinc-500">Loading PDF…</p>
          ) : null}
          {error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : null}
          <canvas ref={canvasRef} className="mx-auto max-w-full bg-white shadow" />
        </div>
      </div>
    </div>
  );
}
