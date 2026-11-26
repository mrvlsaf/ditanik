import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { NewDocumentForm } from "@/components/documents/NewDocumentForm";
import { formatBusinessDateTime } from "@/lib/dates/format";
import {
  getGeneratedDocument,
  listKnownSiteCodes,
} from "@/modules/documents/application/list-generated-documents";
import {
  isSameBusinessDay,
  quotationEditInitialFromSnapshot,
} from "@/modules/documents/domain/quotation-edit";

export default async function EditQuotationPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const document = await getGeneratedDocument(id);
  if (!document || document.type !== "QUOTATION") {
    notFound();
  }

  const siteCodes = await listKnownSiteCodes();
  const sameDay = isSameBusinessDay(document.generatedAt, new Date());

  return (
    <PageContainer
      title="Edit quotation"
      description={document.documentNumber}
      breadcrumb={[
        { label: "Documents", href: "/documents" },
        { label: "Edit quotation" },
      ]}
      actions={
        <Link href="/documents" className="btn-secondary">
          Cancel
        </Link>
      }
    >
      <NewDocumentForm
        siteCodeSuggestions={siteCodes}
        edit={{
          documentId: document.id,
          documentNumber: document.documentNumber,
          sameDay,
          createdLabel: formatBusinessDateTime(document.generatedAt),
          initial: quotationEditInitialFromSnapshot(
            document.snapshot,
            document.documentNumber,
          ),
        }}
      />
    </PageContainer>
  );
}
