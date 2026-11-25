import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { ConvertFilePanel } from "@/components/documents/ConvertFilePanel";
import { GeneratedDocumentRow } from "@/components/documents/GeneratedDocumentRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { InfoTip } from "@/components/ui/InfoTip";
import { Tabs } from "@/components/ui/Tabs";
import { formatBusinessDateTime } from "@/lib/dates/format";
import {
  ALL_DOCUMENTS_LIMIT,
  listAllGeneratedDocuments,
} from "@/modules/documents/application/list-generated-documents";
import {
  DOCUMENT_SOURCE_FILTERS,
  DOCUMENT_TYPE_FILTERS,
  documentsListHref,
  hasDocumentFilters,
  parseDocumentFilters,
} from "@/modules/documents/domain/documents-filters";
import { documentTypeLabel } from "@/modules/documents/domain/independent-document";

type SearchParams = Promise<{
  type?: string | string[];
  source?: string | string[];
  q?: string | string[];
  tab?: string | string[];
  r?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function DocumentsContent({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const filters = parseDocumentFilters(params);
  const documents = await listAllGeneratedDocuments({
    type: filters.type || undefined,
    source: filters.source || undefined,
    q: filters.q || undefined,
  });
  const filtered = hasDocumentFilters(filters);

  const typeChips: FilterChipItem[] = DOCUMENT_TYPE_FILTERS.map((item) => ({
    label: item.label,
    href: documentsListHref({ ...filters, type: item.key }),
    active: item.key === filters.type,
  }));
  const sourceChips: FilterChipItem[] = DOCUMENT_SOURCE_FILTERS.map((item) => ({
    label: item.label,
    href: documentsListHref({ ...filters, source: item.key }),
    active: item.key === filters.source,
  }));

  const list = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">Type</span>
          <FilterChips label="Filter by document type" items={typeChips} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Source
            <span className="ml-1.5 align-middle">
              <InfoTip label="About Source">
                Linked to an LPO means the document was made from an order. Not linked
                means it was made on its own, for example a quotation before an order
                exists.
              </InfoTip>
            </span>
          </span>
          <FilterChips label="Filter by source" items={sourceChips} />
        </div>
        <form method="get" action="/documents" className="flex flex-wrap items-end gap-2">
          {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
          {filters.source ? (
            <input type="hidden" name="source" value={filters.source} />
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)]">Search</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Document number, client or LPO"
              className="min-h-11 w-72 max-w-full rounded-[10px] border border-[#8b928b] bg-white px-3 text-sm"
            />
          </label>
          <button type="submit" className="btn-secondary min-h-11">
            Search
          </button>
          {filtered ? (
            <Link href="/documents" className="btn-ghost min-h-11">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title={
            filtered ? "No documents match these filters" : "No documents created yet"
          }
          action={
            <Link href="/documents/new" className="btn-primary">
              New document
            </Link>
          }
        >
          {filtered
            ? "Try All, or create a new document."
            : "Use New document, or create one from an LPO."}
        </EmptyState>
      ) : (
        <section className="surface-card overflow-hidden" aria-label="Document list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Document number
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3">
                    LPO
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actions
                  </th>
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
                      typeKey: doc.type,
                      generatedAtLabel: formatBusinessDateTime(doc.generatedAt),
                      generatedByLabel: doc.generatedBy.name ?? doc.generatedBy.email,
                      fileKey: doc.fileKey,
                      pdfFileKey: doc.pdfFileKey,
                      clientName: doc.clientName ?? doc.lpo?.clientName ?? null,
                      lpoNumber: doc.lpo?.lpoNumber ?? null,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
            Showing {documents.length} {documents.length === 1 ? "document" : "documents"}
            , newest first
            {documents.length === ALL_DOCUMENTS_LIMIT
              ? `. Only the latest ${ALL_DOCUMENTS_LIMIT} are listed, so use the filters to find older ones`
              : ""}
          </p>
        </section>
      )}
    </div>
  );

  return (
    <Tabs
      key={firstValue(params.r) ?? "initial"}
      label="Documents sections"
      tabs={[
        { id: "list", label: "All documents", content: list },
        { id: "convert", label: "Convert a file to PDF", content: <ConvertFilePanel /> },
      ]}
      defaultId={firstValue(params.tab) === "convert" ? "convert" : "list"}
      syncParam="tab"
    />
  );
}

export default function DocumentsPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  return (
    <PageContainer
      title="Documents"
      description="Every quotation, tax invoice and delivery note you have created, with or without an LPO. Find one, download it, or turn it into a PDF."
      actions={
        <Link href="/documents/new" className="btn-primary">
          New document
        </Link>
      }
    >
      <Suspense fallback={<SectionLoading label="Loading documents…" />}>
        <DocumentsContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
