import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { formatCalendarDate } from "@/lib/dates/format";
import {
  listFabricInvoiceMonths,
  listFabricInvoices,
  listFabricInvoiceSuppliers,
} from "@/modules/fabric/application/list-fabric-invoices";

export default async function InvoicesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    supplier?: string;
    month?: string;
    q?: string;
  }>;
}>) {
  const params = await searchParams;
  const supplier = params.supplier?.trim() || undefined;
  const month = params.month?.trim() || undefined;
  const q = params.q?.trim() || undefined;

  const [suppliers, months, invoices] = await Promise.all([
    listFabricInvoiceSuppliers(),
    listFabricInvoiceMonths(),
    listFabricInvoices({ supplier, month, q }),
  ]);

  const hasFilters = Boolean(supplier || month || q);

  return (
    <PageContainer
      title="Invoices"
      description="Supplier invoices from fabric receives. Newest first — filter by supplier or month."
    >
      <div className="space-y-6">
        <form
          method="get"
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Supplier</span>
            <select
              name="supplier"
              defaultValue={supplier ?? ""}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            >
              <option value="">All suppliers</option>
              {suppliers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Month</span>
            <select
              name="month"
              defaultValue={month ?? ""}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            >
              <option value="">All months</option>
              {months.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Invoice ref
            </span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search reference…"
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link
                href="/invoices"
                className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {invoices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            {hasFilters
              ? "No invoices match these filters."
              : "No supplier invoices yet. Receive fabric with an invoice PDF on the Fabric page."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-3 py-3">Received</th>
                  <th className="px-3 py-3">Supplier</th>
                  <th className="px-3 py-3">Invoice ref</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Batches</th>
                  <th className="px-3 py-3">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top hover:bg-zinc-50">
                    <td className="px-3 py-3 text-zinc-700">
                      {formatCalendarDate(invoice.receivedDate)}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-900">
                      {invoice.supplierName}
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {invoice.invoiceRef}
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{invoice.month}</td>
                    <td className="px-3 py-3 text-zinc-700">
                      <p className="font-medium text-zinc-900">
                        {invoice.batchCount} line
                        {invoice.batchCount === 1 ? "" : "s"}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-zinc-500">
                        {invoice.batches.slice(0, 3).map((batch) => (
                          <li key={batch.id}>
                            {batch.fabricCode}: {batch.fabricType} /{" "}
                            {batch.colour} ({batch.qtyReceived}m)
                          </li>
                        ))}
                        {invoice.batches.length > 3 ? (
                          <li>+{invoice.batches.length - 3} more</li>
                        ) : null}
                      </ul>
                    </td>
                    <td className="px-3 py-3">
                      {invoice.invoiceFileKey && invoice.invoiceFileName ? (
                        <DocumentActions
                          fileKey={invoice.invoiceFileKey}
                          fileName={invoice.invoiceFileName}
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">No PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
