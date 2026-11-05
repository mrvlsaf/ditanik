"use client";

import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

import {
  convertDocumentToPdfAction,
  type ConvertDocumentToPdfActionState,
} from "@/modules/documents/application/convert-document-to-pdf-action";

const initialState: ConvertDocumentToPdfActionState = { ok: false, message: null };

function fileDownloadUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey, download: "1" });
  return `/api/files?${params.toString()}`;
}

export type GeneratedDocumentRowData = {
  id: string;
  documentNumber: string;
  type: string;
  generatedAtLabel: string;
  generatedByLabel: string;
  fileKey: string;
  pdfFileKey: string | null;
};

/** One row of the generated-documents history table, with its own Convert to PDF action. */
export function GeneratedDocumentRow({
  lpoId,
  doc,
}: Readonly<{ lpoId: string; doc: GeneratedDocumentRowData }>) {
  const [state, formAction, isPending] = useActionState(
    convertDocumentToPdfAction,
    initialState,
  );
  useGlobalPending(isPending);

  const pdfFileKey = state.ok ? (state.pdfFileKey ?? doc.pdfFileKey) : doc.pdfFileKey;

  return (
    <tr className="border-t border-zinc-100 align-top">
      <td className="py-2 pr-3 font-medium text-zinc-900">{doc.documentNumber}</td>
      <td className="py-2 pr-3 text-zinc-700">{doc.type}</td>
      <td className="py-2 pr-3 text-zinc-700">{doc.generatedAtLabel}</td>
      <td className="py-2 pr-3 text-zinc-700">{doc.generatedByLabel}</td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={fileDownloadUrl(doc.fileKey)}
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Excel
          </a>
          {pdfFileKey ? (
            <a
              href={fileDownloadUrl(pdfFileKey)}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              PDF
            </a>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="generatedDocumentId" value={doc.id} />
              <input type="hidden" name="lpoId" value={lpoId} />
              <button
                type="submit"
                disabled={isPending}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
                {isPending ? "Converting…" : "Convert to PDF"}
              </button>
            </form>
          )}
        </div>
        {state.message && !state.ok ? (
          <p className="mt-1 text-xs text-red-700" role="status">
            {state.message}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
