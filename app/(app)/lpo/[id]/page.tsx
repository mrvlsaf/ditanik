import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { LpoActionsMenu } from "@/components/lpo/LpoActionsMenu";
import { LpoAssignmentPanel } from "@/components/lpo/LpoAssignmentPanel";
import { LpoDatesSection } from "@/components/lpo/LpoDatesSection";
import { LpoDeepLinkFocus } from "@/components/lpo/LpoDeepLinkFocus";
import { LpoFabricRequirementsSection } from "@/components/lpo/LpoFabricRequirementsSection";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import { DocumentActions } from "@/components/documents/DocumentActions";
import {
  formatBusinessDateTime,
  formatCalendarDate,
} from "@/lib/dates/format";
import { listActiveRates } from "@/modules/fabric/application/consumption";
import { listForLpo } from "@/modules/fabric/application/lpo-fabric-requirements";
import { getLpoById } from "@/modules/lpo/application/get-lpo";
import { lpoStatusDetailLabel } from "@/modules/lpo/domain/lpo-status";
import type { NotificationAction } from "@/modules/notification/domain/due-notification-rules";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";

function parseActionParam(
  value: string | string[] | undefined,
): NotificationAction | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "assign" || raw === "dates" || raw === "complete") {
    return raw;
  }
  return null;
}

export default async function LpoDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const action = parseActionParam(query.action);
  const [lpo, manufacturers, rates, requirements] = await Promise.all([
    getLpoById(id),
    listManufacturers(),
    listActiveRates(),
    listForLpo(id),
  ]);

  if (!lpo) {
    notFound();
  }

  const createdByLabel = lpo.createdBy.name ?? lpo.createdBy.email;

  return (
    <PageContainer
      title={`LPO ${lpo.lpoNumber}`}
      description={lpo.nickname}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/lpo"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to LPO dashboard
        </Link>
        <LpoActionsMenu
          lpoId={lpo.id}
          lpoNumber={lpo.lpoNumber}
          fileKey={lpo.originalFileKey}
          fileName={lpo.originalFileName}
          redirectTo="/lpo"
        />
      </div>

      <LpoDeepLinkFocus action={action} />

      <div className="space-y-8">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LpoStatusBadge status={lpo.status} />
            <p className="text-sm text-zinc-500">
              {lpoStatusDetailLabel(lpo.status)} · Created by {createdByLabel}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Client
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{lpo.clientName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Manufacturer
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {lpo.manufacturer?.name ?? "Pending"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Received date
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatCalendarDate(lpo.receivedDate)}
              </dd>
            </div>
            {lpo.clientDeliveredAt ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Client delivered at
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">
                  {formatBusinessDateTime(lpo.clientDeliveredAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                LPO document
              </p>
              <DocumentActions
                fileKey={lpo.originalFileKey}
                fileName={lpo.originalFileName}
              />
            </div>
            {lpo.productionFileKey && lpo.productionFileName ? (
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Production file
                </p>
                <DocumentActions
                  fileKey={lpo.productionFileKey}
                  fileName={lpo.productionFileName}
                />
              </div>
            ) : null}
          </div>
        </section>

        <LpoDatesSection
          lpoId={lpo.id}
          manufacturerAssignmentAt={lpo.manufacturerAssignmentAt}
          productionDeadlineAt={lpo.productionDeadlineAt}
          clientDeliveryAt={lpo.clientDeliveryAt}
          dateChanges={lpo.dateChanges}
        />

        <LpoAssignmentPanel
          lpoId={lpo.id}
          status={lpo.status}
          manufacturerId={lpo.manufacturerId}
          manufacturerName={lpo.manufacturer?.name ?? null}
          productionFileKey={lpo.productionFileKey}
          manufacturers={manufacturers.map((m) => ({
            id: m.id,
            name: m.name,
          }))}
        />

        <LpoFabricRequirementsSection
          lpoId={lpo.id}
          rates={rates}
          requirements={requirements}
        />
      </div>
    </PageContainer>
  );
}
