import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { AddInvoiceForm } from "@/components/invoices/AddInvoiceForm";
import { isUsingBlobStorage } from "@/modules/files/infrastructure/get-file-storage";
import { parseSupplierInvoiceType } from "@/modules/invoices/domain/invoice-types";

export default async function AddInvoicePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ type?: string | string[] }> }>) {
  const params = await searchParams;
  const raw = Array.isArray(params.type) ? params.type[0] : params.type;
  const initialType = parseSupplierInvoiceType(raw) ?? "accessory";

  return (
    <PageContainer
      title="Add an invoice"
      description="Record an invoice you received for accessories or for manufacturing, with its PDF and lines. It then appears in Invoices with your other invoices for VAT."
      breadcrumb={[
        { label: "Stock" },
        { label: "Invoices", href: "/invoices" },
        { label: "Add invoice" },
      ]}
      actions={
        <Link href="/invoices" className="btn-secondary">
          Cancel
        </Link>
      }
    >
      <div className="space-y-6">
        <section
          aria-label="Other invoice types"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b4cbe8] bg-[#e3edf9] px-[18px] py-3.5"
        >
          <p className="flex-[1_1_460px] text-sm leading-relaxed text-[#17315a]">
            Looking for a fabric invoice? Those are added when you receive fabric. Tax
            invoices for clients are created in Documents, from an LPO or on their own.
          </p>
          <span className="flex flex-wrap gap-2">
            <Link href="/fabric" className="btn-secondary">
              Receive fabric
            </Link>
            <Link href="/documents/new" className="btn-secondary">
              Create tax invoice
            </Link>
          </span>
        </section>

        <AddInvoiceForm
          initialType={initialType}
          usesBlobStorage={isUsingBlobStorage()}
        />
      </div>
    </PageContainer>
  );
}
