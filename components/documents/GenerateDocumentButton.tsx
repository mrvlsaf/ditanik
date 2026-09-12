"use client";

import { useActionState, type ReactNode } from "react";

export type GenerateDocumentActionState = {
  ok: boolean;
  message: string | null;
  documentNumber?: string;
  fileKey?: string;
  fileName?: string;
};

const initialState: GenerateDocumentActionState = { ok: false, message: null };

function fileDownloadUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey, download: "1" });
  return `/api/files?${params.toString()}`;
}

type GenerateDocumentButtonProps = Readonly<{
  lpoId: string;
  label: string;
  pendingLabel: string;
  action: (
    previous: GenerateDocumentActionState,
    formData: FormData,
  ) => Promise<GenerateDocumentActionState>;
  /** Extra form fields rendered above the submit button (e.g. a Delivery Note's Notes field). */
  extraFields?: ReactNode;
}>;

/** Shared "Generate {document type}" form used on the LPO detail page for all four document types. */
export function GenerateDocumentButton({
  lpoId,
  label,
  pendingLabel,
  action,
  extraFields,
}: GenerateDocumentButtonProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="lpoId" value={lpoId} />
      {extraFields}
      <button type="submit" disabled={isPending} className="btn-primary min-h-11">
        {isPending ? pendingLabel : label}
      </button>
      {state.ok && state.fileKey ? (
        <a href={fileDownloadUrl(state.fileKey)} className="btn-secondary">
          Download {state.fileName ?? "document.xlsx"}
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
