import { PageContainer } from "@/components/app-shell/PageContainer";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { listFabricInvoicesByVendor } from "@/modules/fabric/application/create-fabric-entry";

export default async function InvoicesPage() {
  const groups = await listFabricInvoicesByVendor();

  return (
    <PageContainer
      title="Invoices"
      description="Fabric invoices grouped by vendor. Open any PDF in-app or download."
    >
      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          No invoices yet. Add fabric entries with an invoice PDF first.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.vendorNormalized}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <header className="border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {group.vendorLabel}
                </h2>
                <p className="text-xs text-zinc-500">
                  {group.invoices.length} invoice
                  {group.invoices.length === 1 ? "" : "s"}
                </p>
              </header>
              <ul className="divide-y divide-zinc-100">
                {group.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">
                        {invoice.invoiceFileName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {invoice.color} ·{" "}
                        <LocalDateTime value={invoice.createdAt} />
                      </p>
                    </div>
                    <DocumentActions
                      fileKey={invoice.invoiceFileKey}
                      fileName={invoice.invoiceFileName}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
