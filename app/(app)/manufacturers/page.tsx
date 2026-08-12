import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { CreateManufacturerForm } from "@/components/manufacturer/CreateManufacturerForm";
import { ManufacturerActionsMenu } from "@/components/manufacturer/ManufacturerActionsMenu";
import { formatCalendarDate } from "@/lib/dates/format";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";

async function ManufacturerDirectory() {
  const manufacturers = await listManufacturers();

  if (manufacturers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
        No manufacturers yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden surface-card">
      {manufacturers.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Link
              href={`/manufacturers/${m.id}`}
              className="font-medium text-zinc-900 hover:underline"
            >
              {m.name}
            </Link>
            <p className="text-xs text-zinc-500">
              Added {formatCalendarDate(m.createdAt)}
            </p>
          </div>
          <ManufacturerActionsMenu
            manufacturerId={m.id}
            name={m.name}
          />
        </li>
      ))}
    </ul>
  );
}

export default function ManufacturersPage() {
  return (
    <PageContainer
      title="Manufacturers"
      description="Register manufacturers, assign them on LPOs, and open each ledger for fabric on hand vs expected."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Add manufacturer
          </h2>
          <CreateManufacturerForm />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Directory
          </h2>
          <Suspense fallback={<SectionLoading label="Loading manufacturers…" />}>
            <ManufacturerDirectory />
          </Suspense>
        </section>
      </div>
    </PageContainer>
  );
}
