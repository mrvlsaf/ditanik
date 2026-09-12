import { PageContainer } from "@/components/app-shell/PageContainer";

export default function ConvertToPdfPage() {
  return (
    <PageContainer
      title="Convert to PDF"
      description="Made a manual tweak to a generated Excel file before sending it? Upload it here and get the PDF back — no LPO lookup, nothing saved."
    >
      <form
        action="/api/documents/convert-to-pdf"
        method="POST"
        encType="multipart/form-data"
        className="space-y-4 surface-card p-4 sm:p-6"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Excel file (.xlsx, .xls or .ods)
          </span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,.ods"
            required
            className="file-btn"
          />
          <span className="mt-1 block text-xs text-zinc-500">Max 25MB.</span>
        </label>

        <button type="submit" className="btn-primary min-h-11">
          Convert to PDF
        </button>
      </form>
    </PageContainer>
  );
}
