import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { CreateLpoForm } from "@/components/lpo/CreateLpoForm";
import { LpoActionsMenu } from "@/components/lpo/LpoActionsMenu";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import {
  formatBusinessDateTime,
  formatCalendarDate,
} from "@/lib/dates/format";
import { listRecentLpos } from "@/modules/lpo/application/get-lpo";

async function LpoDashboard() {
  const lpos = await listRecentLpos();

  if (lpos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        No LPOs yet. Create the first one above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="px-3 py-3">LPO</th>
            <th className="px-3 py-3">Nickname</th>
            <th className="px-3 py-3">Client</th>
            <th className="px-3 py-3">Received</th>
            <th className="px-3 py-3">Manufacturer</th>
            <th className="px-3 py-3">Production due</th>
            <th className="px-3 py-3">Client delivery</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {lpos.map((lpo) => (
            <tr key={lpo.id} className="hover:bg-zinc-50">
              <td className="px-3 py-3">
                <Link
                  href={`/lpo/${lpo.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {lpo.lpoNumber}
                </Link>
              </td>
              <td className="px-3 py-3 text-zinc-700">{lpo.nickname}</td>
              <td className="px-3 py-3 text-zinc-700">{lpo.clientName}</td>
              <td className="px-3 py-3 text-zinc-700">
                {formatCalendarDate(lpo.receivedDate)}
              </td>
              <td className="px-3 py-3 text-zinc-700">
                {lpo.manufacturer?.name ?? "Pending"}
              </td>
              <td className="px-3 py-3 text-zinc-700">
                {formatBusinessDateTime(lpo.productionDeadlineAt)}
              </td>
              <td className="px-3 py-3 text-zinc-700">
                {formatBusinessDateTime(lpo.clientDeliveryAt)}
              </td>
              <td className="px-3 py-3">
                <LpoStatusBadge status={lpo.status} />
              </td>
              <td className="px-3 py-3 text-right">
                <LpoActionsMenu
                  lpoId={lpo.id}
                  lpoNumber={lpo.lpoNumber}
                  fileKey={lpo.originalFileKey}
                  fileName={lpo.originalFileName}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LpoPage() {
  return (
    <PageContainer
      title="LPO"
      description="Receive LPOs, track internal review and manufacturer production deadlines, then complete client delivery."
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
            Dashboard
          </h2>
          <Suspense fallback={<SectionLoading label="Loading dashboard…" />}>
            <LpoDashboard />
          </Suspense>
        </section>
      </div>
    </PageContainer>
  );
}
