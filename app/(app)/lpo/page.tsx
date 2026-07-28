import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { CreateLpoForm } from "@/components/lpo/CreateLpoForm";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import {
  formatBusinessDateTime,
  formatCalendarDate,
} from "@/lib/dates/format";
import { listRecentLpos } from "@/modules/lpo/application/get-lpo";

export default async function LpoPage() {
  const lpos = await listRecentLpos();

  return (
    <PageContainer
      title="LPO"
      description="Create an LPO, then open it for dates, PDF, and comments."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Create LPO
          </h2>
          <CreateLpoForm />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Recent LPOs
          </h2>
          {lpos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              No LPOs yet. Create the first one above.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {lpos.map((lpo) => (
                <li
                  key={lpo.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/lpo/${lpo.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {lpo.lpoNumber}
                    </Link>
                    <p className="text-xs text-zinc-500 sm:text-sm">
                      Received {formatCalendarDate(lpo.receivedDate)} · Review{" "}
                      {formatBusinessDateTime(lpo.reviewDueAt)} · Delivery{" "}
                      {formatBusinessDateTime(lpo.deliveryDueAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <LpoStatusBadge status={lpo.status} />
                    <DocumentActions
                      fileKey={lpo.originalFileKey}
                      fileName={lpo.originalFileName}
                    />
                    <Link
                      href={`/lpo/${lpo.id}`}
                      className="inline-flex min-h-9 items-center text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
