import { format } from "date-fns";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { CreateLpoForm } from "@/components/lpo/CreateLpoForm";
import { prisma } from "@/lib/db";

type RecentLpo = {
  id: string;
  lpoNumber: string;
  receivedDate: Date;
  originalFileName: string;
  status: "PENDING" | "REVIEWED" | "DELIVERED";
};

export default async function LpoPage() {
  const lpos = (await prisma.lpo.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      lpoNumber: true,
      receivedDate: true,
      originalFileName: true,
      status: true,
    },
  })) as RecentLpo[];

  return (
    <PageContainer
      title="LPO"
      description="Create an LPO. Status starts as Pending."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Create LPO
          </h2>
          <CreateLpoForm />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-700 uppercase">
            Recent LPOs
          </h2>
          {lpos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              No LPOs yet. Create the first one above.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {lpos.map((lpo) => (
                <li
                  key={lpo.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{lpo.lpoNumber}</p>
                    <p className="text-xs text-zinc-500 sm:text-sm">
                      Received {format(lpo.receivedDate, "dd MMM yyyy")} · File{" "}
                      {lpo.originalFileName}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    {lpo.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
