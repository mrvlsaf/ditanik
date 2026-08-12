import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { FabricBatchActionsMenu } from "@/components/fabric/FabricBatchActionsMenu";
import { IssueFabricForm } from "@/components/fabric/IssueFabricForm";
import { ReceiveFabricForm } from "@/components/fabric/ReceiveFabricForm";
import { ReturnFabricForm } from "@/components/fabric/ReturnFabricForm";
import { formatBusinessDateTime, formatCalendarDate } from "@/lib/dates/format";
import {
  listBatchesWithStock,
  listRecentMovements,
} from "@/modules/fabric/application/get-fabric";
import { listRecentLpos } from "@/modules/lpo/application/get-lpo";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";

async function FabricStockAndActions() {
  const [batches, movements, manufacturers, lpos] = await Promise.all([
    listBatchesWithStock(),
    listRecentMovements(40),
    listManufacturers(),
    listRecentLpos(100),
  ]);

  const batchOptions = batches.map((b) => ({
    id: b.id,
    fabricCode: b.fabricCode,
    fabricType: b.fabricType,
    colour: b.colour,
    stockMeters: b.stockMeters,
  }));

  const manufacturerOptions = manufacturers.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  const lpoOptions = lpos.map((l) => ({
    id: l.id,
    lpoNumber: l.lpoNumber,
    nickname: l.nickname,
  }));

  return (
    <>
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
          Available stock
        </h2>
        {batches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            No fabric batches yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-3">Fabric ID</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Colour</th>
                  <th className="px-3 py-3">Supplier</th>
                  <th className="px-3 py-3">Received</th>
                  <th className="px-3 py-3">Available</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {b.fabricCode}
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{b.fabricType}</td>
                    <td className="px-3 py-3 text-zinc-700">{b.colour}</td>
                    <td className="px-3 py-3 text-zinc-700">
                      {b.invoice.supplierName} ({b.invoice.invoiceRef})
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {b.qtyReceived}m ·{" "}
                      {formatCalendarDate(b.invoice.receivedDate)}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {b.stockMeters}m
                    </td>
                    <td className="px-3 py-3 text-right">
                      <FabricBatchActionsMenu
                        batchId={b.id}
                        fabricCode={b.fabricCode}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Issue to manufacturer
          </h2>
          <IssueFabricForm
            batches={batchOptions}
            manufacturers={manufacturerOptions}
            lpos={lpoOptions}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Return from manufacturer
          </h2>
          <ReturnFabricForm
            batches={batchOptions}
            manufacturers={manufacturerOptions}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
          Movement ledger
        </h2>
        {movements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            No movements yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-3">When</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Batch</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Manufacturer</th>
                  <th className="px-3 py-3">LPO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-3 text-zinc-700">
                      {formatBusinessDateTime(m.occurredAt)}
                    </td>
                    <td className="px-3 py-3 text-zinc-900">{m.type}</td>
                    <td className="px-3 py-3 text-zinc-700">
                      {m.batch.fabricCode}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {m.quantityMeters > 0 ? "+" : ""}
                      {m.quantityMeters}m
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {m.manufacturer?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {m.lpo?.lpoNumber ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default function FabricPage() {
  return (
    <PageContainer
      title="Fabric"
      description="Receive supplier invoices (multi-batch), track available stock, and issue fabric to manufacturers. Movements are append-only."
    >
      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Receive fabric
          </h2>
          <ReceiveFabricForm />
        </section>

        <Suspense fallback={<SectionLoading label="Loading stock and movements…" />}>
          <FabricStockAndActions />
        </Suspense>
      </div>
    </PageContainer>
  );
}
