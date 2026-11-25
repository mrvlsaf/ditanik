import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { FabricBatchActionsMenu } from "@/components/fabric/FabricBatchActionsMenu";
import { IssueFabricForm } from "@/components/fabric/IssueFabricForm";
import { ReceiveFabricForm } from "@/components/fabric/ReceiveFabricForm";
import { ReturnFabricForm } from "@/components/fabric/ReturnFabricForm";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile, StatTileRow } from "@/components/ui/StatTile";
import { TabLink } from "@/components/ui/TabLink";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { formatBusinessDateTime, formatCalendarDate } from "@/lib/dates/format";
import {
  getFabricGlance,
  listBatchesWithStock,
  listRecentMovements,
} from "@/modules/fabric/application/get-fabric";
import {
  formatMeters,
  formatSignedMeters,
  movementLabel,
  movementTone,
  pluralise,
} from "@/modules/fabric/domain/fabric-glance";
import { listRecentLpos } from "@/modules/lpo/application/get-lpo";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";
import { isUsingBlobStorage } from "@/modules/files/infrastructure/get-file-storage";
import { firstParam } from "@/lib/search-params";

const TAB_IDS = ["stock", "receive", "issue", "return", "movements"] as const;

async function FabricContent({
  tab,
  batchParam,
  requestId,
}: Readonly<{
  tab: string;
  batchParam: string | undefined;
  requestId: string | undefined;
}>) {
  const [batches, movements, manufacturers, lpos, glance] = await Promise.all([
    listBatchesWithStock(),
    listRecentMovements(40),
    listManufacturers(),
    listRecentLpos(100),
    getFabricGlance(),
  ]);

  const batchOptions = batches.map((b) => ({
    id: b.id,
    fabricCode: b.fabricCode,
    fabricType: b.fabricType,
    colour: b.colour,
    stockMeters: b.stockMeters,
  }));
  const manufacturerOptions = manufacturers.map((m) => ({ id: m.id, name: m.name }));
  const lpoOptions = lpos.map((l) => ({
    id: l.id,
    lpoNumber: l.lpoNumber,
    nickname: l.nickname,
  }));

  const tabs: TabItem[] = [
    {
      id: "stock",
      label: "Stock",
      count: batches.length,
      content:
        batches.length === 0 ? (
          <EmptyState
            title="No fabric in stock yet"
            action={
              <TabLink href="/fabric?tab=receive" className="btn-primary">
                Receive fabric
              </TabLink>
            }
          >
            Receive a supplier invoice and each fabric line becomes a batch here.
          </EmptyState>
        ) : (
          <section className="surface-card overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[17px] font-bold text-[var(--foreground)]">
                Stock by batch
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Each line of a supplier invoice becomes a batch with its own fabric ID
                (for example FAB-0018). Available means received, minus issued, plus
                returned.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Fabric ID
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Colour
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Supplier
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Received
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Available
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-mono text-[13px] font-medium">
                        {b.fabricCode}
                      </td>
                      <td className="px-4 py-3 font-semibold">{b.fabricType}</td>
                      <td className="px-4 py-3">{b.colour}</td>
                      <td className="px-4 py-3">
                        {b.invoice.supplierName}
                        <span className="block text-xs text-[var(--text-muted)]">
                          {b.invoice.invoiceRef} ·{" "}
                          {formatCalendarDate(b.invoice.receivedDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMeters(b.qtyReceived)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatMeters(b.stockMeters)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.stockMeters > 0 ? (
                            <TabLink
                              href={`/fabric?tab=issue&batch=${b.id}`}
                              className="btn-secondary"
                            >
                              Issue
                            </TabLink>
                          ) : null}
                          <FabricBatchActionsMenu
                            batchId={b.id}
                            fabricCode={b.fabricCode}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ),
    },
    {
      id: "receive",
      label: "Receive fabric",
      content: <ReceiveFabricForm usesBlobStorage={isUsingBlobStorage()} />,
    },
    {
      id: "issue",
      label: "Issue to manufacturer",
      content: (
        <IssueFabricForm
          batches={batchOptions}
          manufacturers={manufacturerOptions}
          lpos={lpoOptions}
          defaultBatchId={batchParam}
        />
      ),
    },
    {
      id: "return",
      label: "Record a return",
      content: (
        <ReturnFabricForm
          batches={batchOptions}
          manufacturers={manufacturerOptions}
          lpos={lpoOptions}
          defaultBatchId={batchParam}
        />
      ),
    },
    {
      id: "movements",
      label: "Movements",
      content:
        movements.length === 0 ? (
          <EmptyState title="No movements yet">
            Receiving, issuing or returning fabric will show up here.
          </EmptyState>
        ) : (
          <section className="surface-card overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[17px] font-bold text-[var(--foreground)]">
                Movements
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Every time fabric came in, went to a manufacturer, or came back. Nothing
                here is edited or removed afterwards, so the history stays reliable. The
                latest {movements.length} are shown.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      When
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Batch
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Manufacturer
                    </th>
                    <th scope="col" className="px-4 py-3">
                      LPO
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Metres
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        {formatBusinessDateTime(m.occurredAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={movementTone(m.type)}>{movementLabel(m.type)}</Chip>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] font-medium">
                          {m.batch.fabricCode}
                        </span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {m.batch.fabricType} / {m.batch.colour}
                        </span>
                      </td>
                      <td className="px-4 py-3">{m.manufacturer?.name ?? "—"}</td>
                      <td className="px-4 py-3">{m.lpo?.lpoNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatSignedMeters(m.quantityMeters)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ),
    },
  ];

  const initialTab = (TAB_IDS as readonly string[]).includes(tab) ? tab : "stock";

  return (
    <div className="space-y-6">
      <StatTileRow label="Stock at a glance">
        <StatTile
          label="Available in stock"
          value={formatMeters(glance.availableMeters)}
          sub={`Across ${pluralise(batches.length, "batch", "batches")}`}
          tip="Metres still with you: received, minus issued, plus returned."
        />
        <StatTile
          label="Issued to manufacturers"
          value={formatMeters(glance.issuedOutMeters)}
          sub="Sent and not yet returned"
          tip="Fabric you sent out. The manufacturer ledger shows how much of it should have been used."
        />
        <StatTile
          label="Received this month"
          value={formatMeters(glance.receivedThisMonthMeters)}
          sub={`From ${pluralise(glance.receivedThisMonthInvoices, "supplier invoice")}`}
          tip="Metres received since the start of this month."
        />
      </StatTileRow>

      <Tabs
        key={requestId ?? "initial"}
        label="Fabric sections"
        tabs={tabs}
        defaultId={initialTab}
        syncParam="tab"
      />
    </div>
  );
}

export default async function FabricPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    tab?: string | string[];
    batch?: string | string[];
    r?: string | string[];
  }>;
}>) {
  const query = await searchParams;

  return (
    <PageContainer
      title="Fabric"
      description="The fabric you own and where it went. Receive a supplier invoice, issue fabric to a manufacturer, take returns back, and check every movement."
      actions={
        <TabLink href="/fabric?tab=receive" className="btn-primary">
          Receive fabric
        </TabLink>
      }
    >
      <Suspense fallback={<SectionLoading label="Loading stock and movements…" />}>
        <FabricContent
          tab={firstParam(query.tab) ?? "stock"}
          batchParam={firstParam(query.batch)}
          requestId={firstParam(query.r)}
        />
      </Suspense>
    </PageContainer>
  );
}
