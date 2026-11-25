import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { VarianceForm } from "@/components/fabric/VarianceForm";
import { ManufacturerActionsMenu } from "@/components/manufacturer/ManufacturerActionsMenu";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile, StatTileRow } from "@/components/ui/StatTile";
import { TabLink } from "@/components/ui/TabLink";
import { Tabs } from "@/components/ui/Tabs";
import { formatBusinessDateTime } from "@/lib/dates/format";
import { prisma } from "@/lib/db";
import {
  getManufacturerFabricLedger,
  type ManufacturerFabricLedgerBatch,
} from "@/modules/fabric/application/manufacturer-ledger";
import { formatMeters } from "@/modules/fabric/domain/fabric-glance";
import {
  fabricSentSubtitle,
  summariseLedgerGlance,
  varianceReasonLabel,
} from "@/modules/fabric/domain/ledger-glance";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function LedgerBatchTable({
  batches,
  showExpectedUsed = true,
  emptyLabel,
}: Readonly<{
  batches: ManufacturerFabricLedgerBatch[];
  showExpectedUsed?: boolean;
  emptyLabel: string;
}>) {
  if (batches.length === 0) {
    return <p className="px-5 py-4 text-sm text-[var(--text-muted)]">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Fabric
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Sent
            </th>
            {showExpectedUsed ? (
              <th scope="col" className="px-4 py-3 text-right">
                Expected used
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 text-right">
              Returned
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Expected balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {batches.map((b) => (
            <tr key={b.batchId}>
              <td className="px-4 py-3">
                <span className="font-mono text-[13px] font-medium">{b.fabricCode}</span>{" "}
                {b.fabricType} / {b.colour}
              </td>
              <td className="px-4 py-3 text-right">{formatMeters(b.sent)}</td>
              {showExpectedUsed ? (
                <td className="px-4 py-3 text-right">{formatMeters(b.used)}</td>
              ) : null}
              <td className="px-4 py-3 text-right">{formatMeters(b.returned)}</td>
              <td className="px-4 py-3 text-right font-bold">
                {formatMeters(b.expectedBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ManufacturerDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; r?: string | string[] }>;
}>) {
  const { id } = await params;
  const query = await searchParams;

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id },
  });
  if (!manufacturer || !manufacturer.isActive) {
    notFound();
  }

  const [ledger, variances, varianceCount, lpos] = await Promise.all([
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
    prisma.fabricVariance.count({ where: { manufacturerId: id } }),
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
  const glance = summariseLedgerGlance(ledger.lpoSections, ledger.standalone);

  const tabIds = ["lpo", "extra", "variances"];
  const requestedTab = firstValue(query.tab);

  return (
    <PageContainer
      title={manufacturer.name}
      description="This manufacturer's fabric account. See what you sent for each LPO, what it should have used, and what should still be with them."
      breadcrumb={[
        { label: "Stock" },
        { label: "Manufacturers", href: "/manufacturers" },
        { label: manufacturer.name },
      ]}
      actions={
        <>
          <TabLink href="/fabric?tab=issue" className="btn-primary">
            Issue fabric
          </TabLink>
          <ManufacturerActionsMenu
            manufacturerId={manufacturer.id}
            name={manufacturer.name}
            redirectTo="/manufacturers"
            showLedgerLink={false}
          />
        </>
      }
    >
      <div className="space-y-6">
        <StatTileRow label="Ledger at a glance">
          <StatTile
            label="Fabric sent"
            value={formatMeters(glance.fabricSentMeters)}
            sub={fabricSentSubtitle(glance, ledger.standalone.batches.length > 0)}
            tip="All fabric issued to this manufacturer, whether or not it is tied to an LPO."
          />
          <StatTile
            label="Expected on hand"
            value={formatMeters(glance.expectedOnHandMeters)}
            sub="Sent, minus expected use, minus returns"
            tip="What should still be at the manufacturer, based on what their LPOs were expected to use."
          />
          <StatTile
            label="Variances recorded"
            value={String(varianceCount)}
            sub="Differences from expected use"
            tip="Times the real fabric use was different from expected, with a reason for each."
          />
        </StatTileRow>

        <Tabs
          key={firstValue(query.r) ?? "initial"}
          label="Ledger sections"
          defaultId={requestedTab && tabIds.includes(requestedTab) ? requestedTab : "lpo"}
          syncParam="tab"
          tabs={[
            {
              id: "lpo",
              label: "Ledger by LPO",
              count: ledger.lpoSections.length,
              content:
                ledger.lpoSections.length === 0 ? (
                  <EmptyState title="No LPOs assigned yet">
                    When an LPO is assigned to this manufacturer, its fabric shows up
                    here.
                  </EmptyState>
                ) : (
                  <div className="flex flex-col gap-5">
                    {ledger.lpoSections.map((section) => (
                      <section
                        key={section.lpoId}
                        className="surface-card overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                          <h2 className="text-[17px] font-bold">
                            <Link
                              href={`/lpo/${section.lpoId}`}
                              className="text-[var(--brand)] hover:underline"
                            >
                              LPO {section.lpoNumber}
                            </Link>
                            {section.nickname ? (
                              <span className="ml-2 font-medium text-[var(--text-muted)]">
                                {section.nickname}
                              </span>
                            ) : null}
                          </h2>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <span>
                              Sent <b>{formatMeters(section.totalSent)}</b>
                            </span>
                            <span>
                              Expected balance on hand{" "}
                              <b>{formatMeters(section.totalExpectedBalance)}</b>
                            </span>
                          </div>
                        </div>
                        <dl className="grid gap-3 border-b border-[var(--border)] px-5 py-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                              LPO expected fabric
                            </dt>
                            <dd className="text-sm font-semibold">
                              {formatMeters(section.expectedFabricRequirement)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                              Additional fabric required
                            </dt>
                            <dd className="text-sm font-semibold">
                              {formatMeters(section.additionalFabricRequired)}
                            </dd>
                          </div>
                        </dl>
                        <LedgerBatchTable
                          batches={section.batches}
                          emptyLabel="No fabric issued against this LPO yet."
                        />
                      </section>
                    ))}
                  </div>
                ),
            },
            {
              id: "extra",
              label: "Additional fabric",
              content: (
                <section className="surface-card overflow-hidden">
                  <div className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-4">
                    <h2 className="text-[17px] font-bold">Additional fabric (no LPO)</h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Fabric you issued that is not tied to an order, such as spare fabric
                      or samples. It is not counted toward any LPO&apos;s expected
                      balance.
                    </p>
                    <p className="mt-1 text-sm">
                      Sent <b>{formatMeters(ledger.standalone.totalSent)}</b>
                      <span className="mx-3 text-[var(--border)]">|</span>
                      Expected balance on hand{" "}
                      <b>{formatMeters(ledger.standalone.totalExpectedBalance)}</b>
                    </p>
                  </div>
                  <LedgerBatchTable
                    batches={ledger.standalone.batches}
                    showExpectedUsed={false}
                    emptyLabel={
                      hasAnyFabric
                        ? "No fabric without an LPO for this manufacturer."
                        : "No fabric issued to this manufacturer yet."
                    }
                  />
                </section>
              ),
            },
            {
              id: "variances",
              label: "Variances",
              count: varianceCount,
              content: (
                <div className="flex flex-wrap items-start gap-6">
                  <VarianceForm
                    manufacturerId={id}
                    batches={ledger.batches.map((b) => ({
                      id: b.batchId,
                      fabricCode: b.fabricCode,
                      label: `${b.fabricCode} · ${b.fabricType} / ${b.colour}`,
                    }))}
                    lpos={lpos}
                  />
                  <section className="surface-card flex min-w-0 flex-[1_1_360px] flex-col gap-3 p-5">
                    <h2 className="text-[17px] font-bold">Variance history</h2>
                    {variances.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        No variance records yet.
                      </p>
                    ) : (
                      variances.map((v) => (
                        <div
                          key={v.id}
                          className="flex flex-col gap-1 rounded-[10px] border border-[var(--border)] p-3"
                        >
                          <p className="text-sm font-semibold">
                            Expected {formatMeters(Number(v.expectedMeters))}, actual{" "}
                            {formatMeters(Number(v.actualMeters))}
                            <span className="font-normal text-[var(--text-muted)]">
                              {" "}
                              (difference {Number(v.differenceMeters) > 0 ? "+" : ""}
                              {formatMeters(Number(v.differenceMeters))})
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip tone="amber">{varianceReasonLabel(v.reason)}</Chip>
                            <span className="text-xs text-[var(--text-muted)]">
                              {v.lpo ? `LPO ${v.lpo.lpoNumber}` : "No LPO"}
                              {v.batch ? ` · ${v.batch.fabricCode}` : ""} ·{" "}
                              {formatBusinessDateTime(v.createdAt)}
                            </span>
                          </div>
                          {v.note ? (
                            <p className="text-xs text-[var(--text-muted)]">{v.note}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                    {varianceCount > variances.length ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Showing the latest {variances.length} of {varianceCount}.
                      </p>
                    ) : null}
                  </section>
                </div>
              ),
            },
          ]}
        />
      </div>
    </PageContainer>
  );
}
