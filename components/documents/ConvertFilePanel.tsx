"use client";

import { useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { FORM_CARD_CLASS, FormHeader } from "@/components/ui/Field";
import { saveResponse } from "@/lib/files/download-file";

/** Upload an Excel file you edited yourself and get the PDF back. Nothing is saved. */
export function ConvertFilePanel() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useGlobalPending(isPending);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setIsPending(true);
    try {
      const body = new FormData(form);
      const response = await fetch("/api/documents/convert-to-pdf", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setError((await response.text()) || "Conversion failed.");
        return;
      }
      const saved = await saveResponse(response);
      if (!saved) {
        setError("Could not save the PDF.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${FORM_CARD_CLASS} max-w-[760px]`}>
      <FormHeader
        title="Convert an Excel file to PDF"
        help="Use this only for a file you edited yourself. For documents made here, use the Convert to PDF button in the list. Nothing is saved."
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[var(--foreground)]">Excel file</span>
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,.ods"
          required
          className="file-btn min-h-11 rounded-[10px] border border-dashed border-[#8b928b] bg-[var(--surface-muted)] px-3 py-2"
        />
        <span className="text-xs text-[var(--text-muted)]">
          Accepted: .xlsx, .xls or .ods, up to 25 MB. The PDF downloads when it is ready.
        </span>
      </label>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="status">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Converting…" : "Convert to PDF"}
        </button>
      </div>
    </form>
  );
}
