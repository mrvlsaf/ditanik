import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { GeneratedDocumentRow } from "@/components/documents/GeneratedDocumentRow";
import { formatBusinessDateTime } from "@/lib/dates/format";
import {
  ALL_DOCUMENTS_LIMIT,
  listAllGeneratedDocuments,
} from "@/modules/documents/application/list-generated-documents";
import {
  DOCUMENT_TYPE_LABEL,
  INDEPENDENT_DOCUMENT_TYPES,
  documentTypeLabel,
} from "@/modules/documents/domain/independent-document";

type SearchParams = Promise<{ type?: string; source?: string; q?: string }>;

async function DocumentsContent({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const type = params.type?.trim() || undefined;
  const source = params.source?.trim() || undefined;
  const q = params.q?.trim() || undefined;

  const documents = await listAllGeneratedDocuments({ type, source, q });
  const hasFilters = Boolean(type || source || q);

  return (
    <div className="space-y-6">
      <form
        method="get"
        className="grid gap-3 surface-card p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Type</span>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="">All types</option>
            {INDEPENDENT_DOCUMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Source</span>
          <select
            name="source"
            defaultValue={source ?? ""}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="">All documents</option>
            <option value="lpo">Linked to an LPO</option>
            <option value="independent">Not linked to an LPO</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Search</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Document number, client or LPO number…"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="btn-primary min-h-11">
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/documents"
              className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          {hasFilters
            ? "No documents match these filters."
            : "No documents generated yet. Use New document, or generate one from an LPO."}
        </p>
      ) : (
        <div className="overflow-x-auto surface-card p-4">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="py-2 pr-3">Document #</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">LPO</th>
                <th className="py-2 pr-3">Generated</th>
                <th className="py-2 pr-3">By</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <GeneratedDocumentRow
                  key={doc.id}
                  columns="all"
                  lpoId={doc.lpoId}
                  doc={{
                    id: doc.id,
                    documentNumber: doc.documentNumber,
                    type: documentTypeLabel(doc.type),
                    generatedAtLabel: formatBusinessDateTime(doc.generatedAt),
                    generatedByLabel: doc.generatedBy.name ?? doc.generatedBy.email,
                    fileKey: doc.fileKey,
                    pdfFileKey: doc.pdfFileKey,
                    clientName: null,
                    lpoNumber: doc.lpo?.lpoNumber ?? null,
                  }}
                />
              ))}
            </tbody>
          </table>
          {documents.length === ALL_DOCUMENTS_LIMIT ? (
            <p className="mt-3 text-xs text-zinc-500">
              Showing the latest {ALL_DOCUMENTS_LIMIT} — use the filters to find older
              documents.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  return (
    <PageContainer
      title="Documents"
      description="Every Quotation, Tax Invoice and Delivery Note — from LPOs and generated on their own. Newest first."
    >
      <div className="mb-4 flex justify-end">
        <Link href="/documents/new" className="btn-primary min-h-11">
          New document
        </Link>
      </div>
      <Suspense fallback={<SectionLoading label="Loading documents…" />}>
        <DocumentsContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
