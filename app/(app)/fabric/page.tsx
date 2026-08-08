import { PageContainer } from "@/components/app-shell/PageContainer";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { CreateFabricEntryForm } from "@/components/fabric/CreateFabricEntryForm";
import { listFabricEntries } from "@/modules/fabric/application/create-fabric-entry";
import { calculateMetersRemaining } from "@/modules/fabric/domain/meters";

export default async function FabricInventoryPage() {
  const entries = await listFabricEntries();

  return (
    <PageContainer
      title="Fabric Inventory"
      description="Track fabric received, delivered, remaining meters, and invoice PDFs."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Add fabric
          </h2>
          <CreateFabricEntryForm />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Recent entries
          </h2>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              No fabric entries yet.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {entries.map((entry) => {
                const remaining = calculateMetersRemaining(
                  Number(entry.metersReceived),
                  Number(entry.metersDelivered),
                );
                return (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">
                        {entry.vendor} · {entry.color}
                      </p>
                      <p className="text-xs text-zinc-500 sm:text-sm">
                        In {Number(entry.metersReceived)} m · Out{" "}
                        {Number(entry.metersDelivered)} m · Remaining{" "}
                        {remaining} m · {entry.destination}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Invoice: {entry.invoiceFileName}
                      </p>
                    </div>
                    <DocumentActions
                      fileKey={entry.invoiceFileKey}
                      fileName={entry.invoiceFileName}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
