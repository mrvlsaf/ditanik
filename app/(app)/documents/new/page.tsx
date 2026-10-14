import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { NewDocumentForm } from "@/components/documents/NewDocumentForm";
import { listKnownSiteCodes } from "@/modules/documents/application/list-generated-documents";

export default async function NewDocumentPage() {
  const siteCodes = await listKnownSiteCodes();

  return (
    <PageContainer
      title="New document"
      description="Generate a Quotation, Tax Invoice or Delivery Note without an LPO."
    >
      <div className="mb-4">
        <Link
          href="/documents"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Documents
        </Link>
      </div>
      <NewDocumentForm siteCodeSuggestions={siteCodes} />
    </PageContainer>
  );
}
