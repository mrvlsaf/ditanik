import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { LpoCommentsSection } from "@/components/lpo/LpoCommentsSection";
import { LpoDueDateSection } from "@/components/lpo/LpoDueDateSection";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import { LpoWorkflowPanel } from "@/components/lpo/LpoWorkflowPanel";
import { formatCalendarDate } from "@/lib/dates/format";
import { getLpoById } from "@/modules/lpo/application/get-lpo";

type LpoDetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function LpoDetailPage({ params }: LpoDetailPageProps) {
  const { id } = await params;
  const lpo = await getLpoById(id);

  if (!lpo) {
    notFound();
  }

  const createdByLabel = lpo.createdBy.name ?? lpo.createdBy.email;

  return (
    <PageContainer
      title={lpo.lpoNumber}
      description="LPO detail — status, due dates, PDFs, review/delivery, and comments."
    >
      <div className="space-y-8">
        <div>
          <Link
            href="/lpo"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Back to LPO list
          </Link>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LpoStatusBadge status={lpo.status} />
            <p className="text-sm text-zinc-500">Created by {createdByLabel}</p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Received date
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatCalendarDate(lpo.receivedDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Original file
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{lpo.originalFileName}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Original LPO PDF
            </p>
            <DocumentActions
              fileKey={lpo.originalFileKey}
              fileName={lpo.originalFileName}
            />
          </div>
        </section>

        <LpoDueDateSection
          lpoId={lpo.id}
          reviewDueAt={lpo.reviewDueAt}
          deliveryDueAt={lpo.deliveryDueAt}
          history={lpo.dueDateChanges}
        />

        <LpoWorkflowPanel
          lpoId={lpo.id}
          status={lpo.status}
          reviewFileKey={lpo.reviewFileKey}
          reviewFileName={lpo.reviewFileName}
          reviewedAt={lpo.reviewedAt}
          deliveredAt={lpo.deliveredAt}
        />

        <LpoCommentsSection lpoId={lpo.id} comments={lpo.comments} />
      </div>
    </PageContainer>
  );
}
