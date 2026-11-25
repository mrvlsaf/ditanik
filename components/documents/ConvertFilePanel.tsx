import { FORM_CARD_CLASS, FormHeader } from "@/components/ui/Field";

/** Upload an Excel file you edited yourself and get the PDF back. Nothing is saved. */
export function ConvertFilePanel() {
  return (
    <form
      action="/api/documents/convert-to-pdf"
      method="POST"
      encType="multipart/form-data"
      className={`${FORM_CARD_CLASS} max-w-[760px]`}
    >
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
      <div>
        <button type="submit" className="btn-primary">
          Convert to PDF
        </button>
      </div>
    </form>
  );
}
