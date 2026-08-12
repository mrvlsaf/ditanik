import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { VarianceForm } from "@/components/fabric/VarianceForm";
import { ManufacturerActionsMenu } from "@/components/manufacturer/ManufacturerActionsMenu";
import { formatBusinessDateTime } from "@/lib/dates/format";
import { prisma } from "@/lib/db";
import {
  getManufacturerFabricLedger,
  type ManufacturerFabricLedgerBatch,
} from "@/modules/fabric/application/manufacturer-ledger";

function LedgerBatchTable({
  batches,
  emptyLabel,
}: Readonly<{
  batches: ManufacturerFabricLedgerBatch[];
  emptyLabel: string;
}>) {
  if (batches.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="px-2 py-2">Fabric</th>
            <th className="px-2 py-2">Sent</th>
            <th className="px-2 py-2">Expected used</th>
            <th className="px-2 py-2">Returned</th>
            <th className="px-2 py-2">Expected balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {batches.map((b) => (
            <tr key={b.batchId}>
              <td className="px-2 py-2 text-zinc-900">
                {b.fabricCode} · {b.fabricType} / {b.colour}
              </td>
              <td className="px-2 py-2">{b.sent}m</td>
              <td className="px-2 py-2">{b.used}m</td>
              <td className="px-2 py-2">{b.returned}m</td>
              <td className="px-2 py-2 font-medium">{b.expectedBalance}m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ManufacturerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id },
  });
  if (!manufacturer || !manufacturer.isActive) {
    notFound();
  }

  const [ledger, variances, lpos] = await Promise.all([
    getManufacturerFabricLedger(id),
    prisma.fabricVariance.findMany({
      where: { manufacturerId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        batch: { select: { fabricCode: true, fabricType: true, colour: true } },
        lpo: { select: { lpoNumber: true } },
      },
    }),
    prisma.lpo.findMany({
      where: { manufacturerId: id },
      select: { id: true, lpoNumber: true, nickname: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const hasAnyFabric =
    ledger.lpoSections.some((s) => s.batches.length > 0) ||
    ledger.standalone.batches.length > 0;

  return (
    <PageContainer
      title={manufacturer.name}
      description="Manufacturer fabric account — per LPO and additional fabric issued without an LPO."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/manufacturers"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to manufacturers
        </Link>
        <ManufacturerActionsMenu
          manufacturerId={manufacturer.id}
          name={manufacturer.name}
          redirectTo="/manufacturers"
          showLedgerLink={false}
        />
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Fabric by LPO
          </h2>
          {ledger.lpoSections.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No LPOs assigned to this manufacturer yet.
            </p>
          ) : (
            ledger.lpoSections.map((section) => (
              <div key={section.lpoId} className="surface-card p-4 sm:p-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    <Link
                      href={`/lpo/${section.lpoId}`}
                      className="hover:underline"
                    >
                      LPO {section.lpoNumber}
                    </Link>
                    {section.nickname ? (
                      <span className="font-normal text-zinc-600">
                        {" "}
                        · {section.nickname}
                      </span>
                    ) : null}
                  </h3>
                </div>
                <dl className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-zinc-500 uppercase">
                      LPO expected fabric
                    </dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {section.expectedFabricRequirement}m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500 uppercase">
                      Expected balance on hand
                    </dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {section.totalExpectedBalance}m
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500 uppercase">
                      Additional fabric required
                    </dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {section.additionalFabricRequired}m
                    </dd>
                  </div>
                </dl>
                <LedgerBatchTable
                  batches={section.batches}
                  emptyLabel="No fabric issued against this LPO yet."
                />
              </div>
            ))
          )}
        </section>

        <section className="surface-card p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Additional fabric (no LPO)
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            Fabric issued to this manufacturer without linking an LPO. It is not
            counted toward any LPO expected balance.
          </p>
          <dl className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500 uppercase">Sent</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {ledger.standalone.totalSent}m
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 uppercase">
                Expected balance on hand
              </dt>
              <dd className="text-sm font-medium text-zinc-900">
                {ledger.standalone.totalExpectedBalance}m
              </dd>
            </div>
          </dl>
          <LedgerBatchTable
            batches={ledger.standalone.batches}
            emptyLabel={
              hasAnyFabric
                ? "No standalone (no-LPO) fabric for this manufacturer."
                : "No fabric issued to this manufacturer yet."
            }
          />
        </section>

        <VarianceForm
          manufacturerId={id}
          batches={ledger.batches.map((b) => ({
            id: b.batchId,
            fabricCode: b.fabricCode,
            label: `${b.fabricCode} · ${b.fabricType} / ${b.colour}`,
          }))}
          lpos={lpos}
        />

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Variance history
          </h2>
          {variances.length === 0 ? (
            <p className="text-sm text-zinc-500">No variance records yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden surface-card">
              {variances.map((v) => (
                <li key={v.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-zinc-900">
                    Expected {Number(v.expectedMeters)}m · Actual{" "}
                    {Number(v.actualMeters)}m · Diff{" "}
                    {Number(v.differenceMeters) > 0 ? "+" : ""}
                    {Number(v.differenceMeters)}m
                  </p>
                  <p className="text-zinc-600">
                    {v.reason.replace(/_/g, " ")}
                    {v.batch ? ` · ${v.batch.fabricCode}` : ""}
                    {v.lpo ? ` · LPO ${v.lpo.lpoNumber}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBusinessDateTime(v.createdAt)}
                    {v.note ? ` · ${v.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
