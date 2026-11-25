import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { NewDocumentForm } from "@/components/documents/NewDocumentForm";
import { listKnownSiteCodes } from "@/modules/documents/application/list-generated-documents";

export default async function NewDocumentPage() {
  const siteCodes = await listKnownSiteCodes();

  return (
    <PageContainer
      title="New document"
      description="Create a quotation, tax invoice or delivery note by filling it in yourself. No LPO is needed."
      actions={
        <Link href="/documents" className="btn-secondary">
          Cancel
        </Link>
      }
    >
      <div className="space-y-6">
        <section
          aria-label="Tip"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b4cbe8] bg-[#e3edf9] px-4 py-3.5"
        >
          <p className="min-w-[260px] flex-1 text-sm leading-relaxed text-[#17315a]">
            Have an LPO for this? Open it and use its Documents tab. The client, address
            and lines are filled in for you.
          </p>
          <Link href="/lpo" className="btn-secondary">
            Go to LPOs
          </Link>
        </section>
        <NewDocumentForm siteCodeSuggestions={siteCodes} />
      </div>
    </PageContainer>
  );
}
