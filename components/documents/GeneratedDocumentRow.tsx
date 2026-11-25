"use client";

import Link from "next/link";
import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { Chip } from "@/components/ui/Chip";
import { documentTypeTone } from "@/modules/documents/domain/documents-filters";

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
  /** Readable name, for example "Tax Invoice". */
  type: string;
  /** Stored type (QUOTATION, TAX_INVOICE, DELIVERY_NOTE); sets the chip colour. */
  typeKey?: string;
  generatedAtLabel: string;
  generatedByLabel: string;
  fileKey: string;
  pdfFileKey: string | null;
  /** Only shown in the Documents list (`columns="all"`). */
  clientName?: string | null;
  lpoNumber?: string | null;
};

/** One row of the generated-documents history table, with its own Convert to PDF action. */
export function GeneratedDocumentRow({
  lpoId,
  doc,
  columns = "lpo",
}: Readonly<{
  /** Null for independent documents (generated without an LPO). */
  lpoId: string | null;
  doc: GeneratedDocumentRowData;
  /** "lpo": the LPO page history table. "all": the Documents list (adds Client and LPO columns). */
  columns?: "lpo" | "all";
}>) {
  const [state, formAction, isPending] = useActionState(
    convertDocumentToPdfAction,
    initialState,
  );
  useGlobalPending(isPending);

  const pdfFileKey = state.ok ? (state.pdfFileKey ?? doc.pdfFileKey) : doc.pdfFileKey;

  return (
    <tr className="border-t border-[var(--border)] align-top">
      <td className="px-4 py-3 font-mono text-[13px] font-bold text-[var(--foreground)]">
        {doc.documentNumber}
      </td>
      <td className="px-4 py-3">
        <Chip tone={documentTypeTone(doc.typeKey ?? "")}>{doc.type}</Chip>
      </td>
      {columns === "all" ? (
        <>
          <td className="px-4 py-3">{doc.clientName ?? "—"}</td>
          <td className="px-4 py-3">
            {lpoId && doc.lpoNumber ? (
              <Link
                href={`/lpo/${lpoId}`}
                className="font-semibold text-[var(--brand)] hover:underline"
              >
                LPO {doc.lpoNumber}
              </Link>
            ) : (
              <span className="text-[var(--text-muted)]">Not linked</span>
            )}
          </td>
        </>
      ) : null}
      <td className="px-4 py-3">
        {doc.generatedAtLabel}
        <span className="block text-xs text-[var(--text-muted)]">
          by {doc.generatedByLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <a href={fileDownloadUrl(doc.fileKey)} className="btn-secondary min-h-9">
            Download
          </a>
          {pdfFileKey ? (
            <a href={fileDownloadUrl(pdfFileKey)} className="btn-secondary min-h-9">
              Download PDF
            </a>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="generatedDocumentId" value={doc.id} />
              {lpoId ? <input type="hidden" name="lpoId" value={lpoId} /> : null}
              <button
                type="submit"
                disabled={isPending}
                className="btn-secondary min-h-9"
              >
                {isPending ? "Converting…" : "Convert to PDF"}
              </button>
            </form>
          )}
        </div>
        {state.message && !state.ok ? (
          <p className="mt-1 text-xs text-[var(--danger)]" role="status">
            {state.message}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
