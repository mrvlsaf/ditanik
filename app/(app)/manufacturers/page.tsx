import Link from "next/link";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { CreateManufacturerForm } from "@/components/manufacturer/CreateManufacturerForm";
import { formatCalendarDate } from "@/lib/dates/format";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";

export default async function ManufacturersPage() {
  const manufacturers = await listManufacturers();

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
          {manufacturers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              No manufacturers yet.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {manufacturers.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                  <Link
                    href={`/manufacturers/${m.id}`}
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                  >
                    Fabric ledger →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
