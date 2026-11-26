import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { CreateManufacturerForm } from "@/components/manufacturer/CreateManufacturerForm";
import { ManufacturerActionsMenu } from "@/components/manufacturer/ManufacturerActionsMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { formatCalendarDate } from "@/lib/dates/format";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";

async function ManufacturerDirectory() {
  const manufacturers = await listManufacturers();

  if (manufacturers.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title="No manufacturers yet">
          Add one above, then assign them on an LPO.
        </EmptyState>
      </div>
    );
  }

  return (
    <ul>
      {manufacturers.map((m) => (
        <li
          key={m.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-b-0"
        >
          <div>
            <Link
              href={`/manufacturers/${m.id}`}
              className="text-base font-bold text-[var(--foreground)] hover:underline"
            >
              {m.name}
            </Link>
            <p className="text-xs text-[var(--text-muted)]">
              Added {formatCalendarDate(m.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/manufacturers/${m.id}`} className="btn-secondary">
              Open ledger
            </Link>
            <ManufacturerActionsMenu
              manufacturerId={m.id}
              name={m.name}
              showLedgerLink={false}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ManufacturersPage() {
  return (
    <PageContainer
      title="Manufacturers"
      description="The people who make your orders. Add a manufacturer, assign them on an LPO, and open their ledger to see fabric sent against fabric expected."
    >
      <div className="space-y-6">
        <CreateManufacturerForm />

        <section className="surface-card overflow-hidden" aria-labelledby="directory">
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4">
            <h2 id="directory" className="text-[17px] font-bold">
              Directory
            </h2>
            <InfoTip label="What is a ledger?">
              The ledger shows, for each manufacturer, how much fabric you sent, how much
              their orders should have used, what came back, and what should still be with
              them.
            </InfoTip>
          </div>
          <Suspense fallback={<SectionLoading label="Loading manufacturers…" />}>
            <ManufacturerDirectory />
          </Suspense>
        </section>
      </div>
    </PageContainer>
  );
}
