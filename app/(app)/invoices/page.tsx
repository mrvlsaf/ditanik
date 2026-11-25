import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { InvoiceRowActions } from "@/components/invoices/InvoiceRowActions";
import { InvoiceTypeCards } from "@/components/invoices/InvoiceTypeCards";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import {
  FilterForm,
  FilterLink,
  FilterNavigation,
  PendingRegion,
} from "@/components/ui/FilterNavigation";
import { ResultsSkeleton } from "@/components/ui/ResultsSkeleton";
import { InfoTip } from "@/components/ui/InfoTip";
import { StatTile, StatTileRow } from "@/components/ui/StatTile";
import { formatCalendarDate } from "@/lib/dates/format";
import { listAllInvoices } from "@/modules/invoices/application/list-invoices";
import {
  TAX_LPO_FILTERS,
  countInvoicesByType,
  filterInvoiceRows,
  hasInvoiceFilters,
  invoiceMonths,
  invoicesListHref,
  parseInvoiceFilters,
  summariseVat,
} from "@/modules/invoices/domain/invoice-hub";
import {
  INVOICE_TYPES,
  INVOICE_TYPE_INFO,
} from "@/modules/invoices/domain/invoice-types";
import { formatAmount } from "@/lib/format-amount";

type SearchParams = Promise<{
  type?: string | string[];
  month?: string | string[];
  q?: string | string[];
  lpo?: string | string[];
}>;

async function InvoicesContent({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const filters = parseInvoiceFilters(await searchParams);
  const everything = await listAllInvoices();
  const counts = countInvoicesByType(everything);
  const months = invoiceMonths(everything);
  const rows = filterInvoiceRows(everything, filters);
  const vat = summariseVat(rows);
  const filtered = hasInvoiceFilters(filters);

  const lpoChips: FilterChipItem[] = TAX_LPO_FILTERS.map((item) => ({
    label: item.label,
    href: invoicesListHref({ ...filters, lpo: item.key }),
    active: item.key === filters.lpo,
  }));

  const typeOptions = [
    {
      key: "all" as const,
      label: "All invoices",
      description: "Everything, in one list.",
      tone: "gray" as const,
    },
    ...INVOICE_TYPES.map((key) => ({
      key,
      label: INVOICE_TYPE_INFO[key].pluralLabel,
      description: INVOICE_TYPE_INFO[key].description,
      tone: INVOICE_TYPE_INFO[key].tone,
    })),
  ];

  const cards = typeOptions.map((card) => ({
    ...card,
    count: counts[card.key],
    href: invoicesListHref({ ...filters, type: card.key }),
    active: card.key === filters.type,
  }));

  const missingTotalNote =
    vat.withoutTotal > 0
      ? `${vat.withoutTotal} ${vat.withoutTotal === 1 ? "invoice has" : "invoices have"} no total and ${vat.withoutTotal === 1 ? "is" : "are"} left out`
      : null;

  return (
    <FilterNavigation>
      <div className="space-y-6">
        <InvoiceTypeCards cards={cards} />

        <section
          aria-label="Filters"
          className="surface-card flex flex-wrap items-end gap-x-6 gap-y-4 p-5"
        >
          <FilterForm
            key={`${filters.month}|${filters.q}`}
            action="/invoices"
            className="flex flex-[2_1_420px] flex-wrap items-end gap-3"
          >
            {filters.type !== "all" ? (
              <input type="hidden" name="type" value={filters.type} />
            ) : null}
            {filters.lpo !== "any" ? (
              <input type="hidden" name="lpo" value={filters.lpo} />
            ) : null}
            <label className="flex min-w-40 flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[#2c322c]">Month</span>
              <select
                name="month"
                defaultValue={filters.month}
                className="min-h-11 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 text-sm"
              >
                <option value="all">All months</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-52 flex-[2_1_220px] flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[#2c322c]">Search</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Reference, client or supplier"
                className="min-h-11 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 text-sm"
              />
            </label>
            <button type="submit" className="btn-secondary min-h-11">
              Apply
            </button>
            {filtered ? (
              <FilterLink href="/invoices" className="btn-ghost min-h-11">
                Clear
              </FilterLink>
            ) : null}
          </FilterForm>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#2c322c]">
              Tax invoices
              <span className="ml-1.5 align-middle">
                <InfoTip label="About the tax invoice filter">
                  Applies to tax invoices only. With an LPO means made from an LPO page.
                  Without an LPO means made on its own.
                </InfoTip>
              </span>
            </span>
            <FilterChips label="Filter tax invoices by LPO" items={lpoChips} />
          </div>
        </section>

        <PendingRegion skeleton={<ResultsSkeleton tiles />}>
          <div className="space-y-6">
            <StatTileRow label="VAT summary for this list">
              <StatTile
                label="VAT you charged"
                value={`AED ${formatAmount(vat.charged)}`}
                sub="On tax invoices in this list"
                tip="The VAT on tax invoices you sent to clients. This is the VAT you collect and pay over."
              />
              <StatTile
                label="VAT you paid"
                value={`AED ${formatAmount(vat.paid)}`}
                sub={missingTotalNote ?? "On invoices you received"}
                tip="The VAT on fabric, accessory and manufacturing invoices you received."
              />
              <StatTile
                label="Net VAT"
                value={`AED ${formatAmount(vat.net)}`}
                sub="Charged minus paid"
                tip="A quick view for the list on screen. Always check it against your VAT return."
              />
            </StatTileRow>

            <section className="surface-card overflow-hidden" aria-label="Invoice list">
              {rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title={
                      filtered ? "No invoices match these filters" : "No invoices yet"
                    }
                    action={
                      filtered ? (
                        <FilterLink href="/invoices" className="btn-secondary">
                          Show all invoices
                        </FilterLink>
                      ) : (
                        <Link href="/invoices/new" className="btn-primary">
                          Add invoice
                        </Link>
                      )
                    }
                  >
                    {filtered
                      ? "Try All types or All months."
                      : "Create a tax invoice, receive fabric, or add an accessory or manufacturing invoice."}
                  </EmptyState>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-stack-lg w-full min-w-[920px] text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold tracking-wide text-[#4d544d] uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Client or supplier
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Reference
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Linked to
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Amount (AED)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          VAT
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0ea]">
                      {rows.map((row) => {
                        const info = INVOICE_TYPE_INFO[row.type];
                        return (
                          <tr key={row.key} className="hover:bg-[#fafbf9]">
                            <td data-label="Date" className="px-4 py-3 whitespace-nowrap">
                              {formatCalendarDate(row.date)}
                            </td>
                            <td data-label="Type" className="px-4 py-3">
                              <Chip tone={info.tone}>{info.label}</Chip>
                            </td>
                            <td data-label="Client or supplier" className="px-4 py-3">
                              <div className="font-semibold">{row.party}</div>
                              <div className="text-[13px] text-[#4d544d]">
                                {info.role}
                              </div>
                            </td>
                            <td
                              data-label="Reference"
                              className="px-4 py-3 font-semibold"
                            >
                              {row.reference ?? (
                                <span className="font-normal text-[#4d544d]">
                                  No reference
                                </span>
                              )}
                            </td>
                            <td data-label="Linked to" className="px-4 py-3">
                              {row.linkLabel && row.linkHref ? (
                                <Link
                                  href={row.linkHref}
                                  className="font-semibold text-[var(--brand)] hover:underline"
                                >
                                  {row.linkLabel}
                                </Link>
                              ) : row.type === "tax" ? (
                                <Link
                                  href="/documents"
                                  className="font-semibold text-[var(--brand)] hover:underline"
                                >
                                  No LPO
                                </Link>
                              ) : (
                                <span className="text-[#4d544d]">No link</span>
                              )}
                            </td>
                            <td
                              data-label="Amount (AED)"
                              className="px-4 py-3 text-right font-semibold whitespace-nowrap"
                            >
                              {row.amount === null ? "—" : formatAmount(row.amount)}
                            </td>
                            <td
                              data-label="VAT"
                              className="px-4 py-3 text-right whitespace-nowrap"
                            >
                              {row.vat === null ? "—" : formatAmount(row.vat)}
                            </td>
                            <td data-label="Actions" className="px-4 py-3">
                              <InvoiceRowActions
                                type={row.type}
                                id={row.id}
                                reference={row.reference ?? `from ${row.party}`}
                                fileKey={row.fileKey}
                                fileName={row.fileName}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="border-t border-[var(--border)] px-4 py-3.5 text-[13px] text-[#4d544d]">
                Showing {rows.length} {rows.length === 1 ? "invoice" : "invoices"}, newest
                first
              </p>
            </section>
          </div>
        </PendingRegion>
      </div>
    </FilterNavigation>
  );
}

export default function InvoicesPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  return (
    <PageContainer
      title="Invoices"
      description="Every invoice in one place, for VAT filing and payments. Tax invoices you send to clients, plus invoices you receive for fabric, accessories and manufacturing."
      info="Four kinds of invoice live here: tax invoices you send to clients, and invoices you receive for fabric, accessories and manufacturing. Together they cover what you need for VAT."
      actions={
        <>
          <Link href="/documents/new" className="btn-secondary">
            Create tax invoice
          </Link>
          <Link href="/invoices/new" className="btn-primary">
            Add invoice
          </Link>
        </>
      }
    >
      <Suspense fallback={<SectionLoading label="Loading invoices…" />}>
        <InvoicesContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
