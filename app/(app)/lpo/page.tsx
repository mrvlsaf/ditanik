import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { LpoActionsMenu } from "@/components/lpo/LpoActionsMenu";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { formatBusinessDate, formatCalendarDate } from "@/lib/dates/format";
import { countLposByFilter, listLposPage } from "@/modules/lpo/application/get-lpo";
import {
  LPO_FILTERS,
  lpoListHref,
  parseLpoFilter,
  parsePage,
  type LpoFilterKey,
} from "@/modules/lpo/domain/lpo-filters";
import { isOverdue } from "@/modules/lpo/domain/today";

async function LpoDashboard({
  filter,
  requestedPage,
}: Readonly<{
  filter: LpoFilterKey;
  requestedPage: number;
}>) {
  const now = new Date();
  const counts = await countLposByFilter(now);
  const { rows, total, window } = await listLposPage({
    filter,
    page: requestedPage,
    total: counts[filter],
    now,
  });

  if (counts.all === 0) {
    return (
      <EmptyState
        title="No LPOs yet"
        action={
          <Link href="/lpo/new" className="btn-primary">
            New LPO
          </Link>
        }
      >
        Create the first one. It starts as Under review.
      </EmptyState>
    );
  }

  const chips: FilterChipItem[] = LPO_FILTERS.map((item) => ({
    label: item.label,
    href: lpoListHref(item.key),
    count: counts[item.key],
    active: item.key === filter,
  }));

  return (
    <div className="space-y-4">
      <FilterChips label="Filter LPOs by status" items={chips} />

      <section className="surface-card" aria-label="LPO list">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No LPOs here"
              action={
                <Link href={lpoListHref("all")} className="btn-secondary">
                  Show all LPOs
                </Link>
              }
            >
              No LPO matches this filter right now.
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold tracking-wide text-[#4d544d] uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    LPO
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Received
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Manufacturer
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Production due
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Client delivery
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0ea]">
                {rows.map((lpo) => (
                  <tr key={lpo.id} className="hover:bg-[#fafbf9]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/lpo/${lpo.id}`}
                        className="font-bold text-[#2f5639] hover:text-[#1f3d27]"
                      >
                        {lpo.nickname}
                      </Link>
                      <div className="text-xs text-[#4d544d]">{lpo.lpoNumber}</div>
                    </td>
                    <td className="px-4 py-3">{lpo.clientName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCalendarDate(lpo.receivedDate)}
                    </td>
                    <td className="px-4 py-3">
                      {lpo.manufacturer?.name ?? "Not assigned"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lpo.productionDeadlineAt
                        ? formatBusinessDate(lpo.productionDeadlineAt)
                        : "No deadline"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lpo.clientDeliveryAt
                        ? formatBusinessDate(lpo.clientDeliveryAt)
                        : "No deadline"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        <LpoStatusBadge status={lpo.status} />
                        {isOverdue(
                          {
                            ...lpo,
                            manufacturerName: lpo.manufacturer?.name ?? null,
                          },
                          now,
                        ) ? (
                          <Chip tone="red">Overdue</Chip>
                        ) : null}
                        {lpo.isUrgent ? <Chip tone="purple">Urgent</Chip> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Link href={`/lpo/${lpo.id}`} className="btn-secondary">
                          Open
                        </Link>
                        <LpoActionsMenu
                          lpoId={lpo.id}
                          lpoNumber={lpo.lpoNumber}
                          fileKey={lpo.originalFileKey}
                          fileName={lpo.originalFileName}
                          trigger="more"
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3.5 text-[13px] text-[#4d544d]">
          <p>
            Showing {window.from}–{window.to} of {total} {total === 1 ? "LPO" : "LPOs"},
            newest first
          </p>
          {window.totalPages > 1 ? (
            <nav aria-label="Pages" className="flex items-center gap-2">
              {window.page > 1 ? (
                <Link
                  href={lpoListHref(filter, window.page - 1)}
                  className="btn-secondary"
                >
                  Previous
                </Link>
              ) : null}
              <span>
                Page {window.page} of {window.totalPages}
              </span>
              {window.page < window.totalPages ? (
                <Link
                  href={lpoListHref(filter, window.page + 1)}
                  className="btn-secondary"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default async function LpoPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ filter?: string; page?: string }>;
}>) {
  const params = await searchParams;
  const filter = parseLpoFilter(params.filter);
  const requestedPage = parsePage(params.page);

  return (
    <PageContainer
      title="LPOs"
      actions={
        <Link href="/lpo/new" className="btn-primary">
          New LPO
        </Link>
      }
      description="Every customer order in one list. Open an LPO to assign a manufacturer, extend dates, and create its documents."
      info="LPO stands for Local Purchase Order: the order your customer sends you. Each LPO moves from Under review, to Assigned to a manufacturer, to Client delivery completed. A red Overdue tag means a planned date has passed. Dates are worked out from the date received."
    >
      <Suspense fallback={<SectionLoading label="Loading dashboard…" />}>
        <LpoDashboard filter={filter} requestedPage={requestedPage} />
      </Suspense>
    </PageContainer>
  );
}
