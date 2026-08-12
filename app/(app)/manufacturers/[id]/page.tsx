import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { VarianceForm } from "@/components/fabric/VarianceForm";
import { ManufacturerActionsMenu } from "@/components/manufacturer/ManufacturerActionsMenu";
import { formatBusinessDateTime } from "@/lib/dates/format";
import { prisma } from "@/lib/db";
import { calculateAdditionalFabricRequired } from "@/modules/fabric/domain/meters";
import { getManufacturerFabricLedger } from "@/modules/fabric/application/manufacturer-ledger";

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

  const totalExpectedBalance = ledger.batches.reduce(
    (sum, b) => sum + b.expectedBalance,
    0,
  );
  const additionalForOpenRequirements = calculateAdditionalFabricRequired(
    ledger.totalExpectedFabricRequirement,
    totalExpectedBalance,
  );

  return (
    <PageContainer
      title={manufacturer.name}
      description="Manufacturer fabric account — sent, expected used, expected balance, and variance."
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
        <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Fabric currently with them
          </h2>
          <dl className="mb-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-500 uppercase">
                LPO expected fabric
              </dt>
              <dd className="text-sm font-medium text-zinc-900">
                {ledger.totalExpectedFabricRequirement}m
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 uppercase">
                Expected balance on hand
              </dt>
              <dd className="text-sm font-medium text-zinc-900">
                {totalExpectedBalance}m
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 uppercase">
                Additional fabric required
              </dt>
              <dd className="text-sm font-medium text-zinc-900">
                {additionalForOpenRequirements}m
              </dd>
            </div>
          </dl>

          {ledger.batches.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No fabric issued to this manufacturer yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="px-2 py-2">Fabric</th>
                    <th className="px-2 py-2">Received</th>
                    <th className="px-2 py-2">Expected used</th>
                    <th className="px-2 py-2">Returned</th>
                    <th className="px-2 py-2">Expected balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ledger.batches.map((b) => (
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
          )}
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
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
                    {v.batch
                      ? ` · ${v.batch.fabricCode}`
                      : ""}
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
