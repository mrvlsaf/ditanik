"use client";

import { useActionState } from "react";

import {
  generateInvoiceAction,
  type GenerateInvoiceActionState,
} from "@/modules/documents/application/generate-invoice-action";

const initialState: GenerateInvoiceActionState = { ok: false, message: null };

function fileDownloadUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey, download: "1" });
  return `/api/files?${params.toString()}`;
}

/**
 * Phase 2 proof-of-pipeline: fills the (code-built, non-pixel-perfect) invoice
 * workbook from this LPO's stored client details + line items, allocates its
 * document number, and offers it back as a download.
 */
export function GenerateInvoiceButton({ lpoId }: Readonly<{ lpoId: string }>) {
  const [state, formAction, isPending] = useActionState(
    generateInvoiceAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="lpoId" value={lpoId} />
      <button type="submit" disabled={isPending} className="btn-primary min-h-11">
        {isPending ? "Generating…" : "Generate Tax Invoice"}
      </button>
      {state.ok && state.fileKey ? (
        <a href={fileDownloadUrl(state.fileKey)} className="btn-secondary">
          Download {state.fileName ?? "invoice.xlsx"}
        </a>
      ) : null}
      {state.message ? (
        <p
          className={`w-full text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
