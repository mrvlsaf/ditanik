import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { getFabricOnHand, getTodaySummary } from "@/modules/lpo/application/get-today";
import {
  UPCOMING_DAYS,
  todayHeading,
  type AttentionItem,
  type UpcomingItem,
} from "@/modules/lpo/domain/today";

/** Rows shown under "Needs action now" before pointing to the full list. */
const ATTENTION_ROWS = 8;

const START_ACTIONS = [
  {
    title: "New LPO",
    description: "Record a customer order and upload its PDF.",
    href: "/lpo",
    icon: "M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 6H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1h-2M12 11v6M9 14h6",
  },
  {
    title: "Receive fabric",
    description: "Record a supplier invoice and the fabric on it.",
    href: "/fabric",
    icon: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  },
  {
    title: "New document",
    description:
      "Make a quotation, tax invoice or delivery note, with or without an LPO.",
    href: "/documents/new",
    icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  },
] as const;

const ORDER_STEPS = [
  { title: "Create the LPO and upload its PDF", where: "Orders › LPOs", href: "/lpo" },
  { title: "Review it and add the fabric it needs", where: "Open the LPO", href: "/lpo" },
  { title: "Assign a manufacturer", where: "Open the LPO", href: "/lpo" },
  { title: "Issue fabric to the manufacturer", where: "Stock › Fabric", href: "/fabric" },
  { title: "Mark client delivery completed", where: "Open the LPO", href: "/lpo" },
  { title: "Create the documents", where: "Orders › Documents", href: "/documents" },
] as const;

function formatMeters(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} m`;
}

function StatTile({
  label,
  tip,
  value,
  valueClassName,
  help,
  href,
  linkLabel,
}: Readonly<{
  label: string;
  tip: string;
  value: string;
  valueClassName?: string;
  help: string;
  href: string;
  linkLabel: string;
}>) {
  return (
    <div className="surface-card flex flex-col gap-1.5 px-5 py-[18px]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#4d544d]">
        <span>{label}</span>
        <InfoTip label={`What does ${label} mean?`} side="below">
          {tip}
        </InfoTip>
      </div>
      <p
        className={`text-[34px] leading-[1.1] font-bold tracking-tight ${valueClassName ?? "text-[var(--foreground)]"}`}
      >
        {value}
      </p>
      <p className="text-[13px] leading-snug text-[#4d544d]">{help}</p>
      <Link
        href={href}
        className="inline-flex min-h-8 items-center text-sm font-semibold text-[#2f5639] hover:text-[#1f3d27]"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

function AttentionRow({ item }: Readonly<{ item: AttentionItem }>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ea] px-5 py-3.5 last:border-b-0 hover:bg-[var(--surface-muted)]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/lpo/${item.lpoId}`}
            className="text-[15px] font-bold text-[#2f5639] hover:text-[#1f3d27]"
          >
            LPO {item.lpoNumber}
          </Link>
          <span className="text-sm text-[#4d544d]">{item.clientName}</span>
        </div>
        <div>
          <Chip tone={item.tone}>{item.reason}</Chip>
        </div>
      </div>
      <Link href={item.actionHref} className="btn-secondary">
        {item.actionLabel}
      </Link>
    </li>
  );
}

function UpcomingRow({ item }: Readonly<{ item: UpcomingItem }>) {
  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-[#eef0ea] px-5 py-3 last:border-b-0">
      <p className="w-20 text-sm font-bold">{item.dateLabel}</p>
      <p className="min-w-0 flex-[1_1_200px] text-sm">
        <Link
          href={`/lpo/${item.lpoId}`}
          className="font-semibold text-[#2f5639] hover:text-[#1f3d27]"
        >
          LPO {item.lpoNumber}
        </Link>{" "}
        <span className="text-[#4d544d]">{item.clientName}</span>
      </p>
      <Chip tone={item.kind === "PRODUCTION_DEADLINE" ? "blue" : "green"}>
        {item.kindLabel}
      </Chip>
      <p className="w-36 text-[13px] text-[#4d544d]">{item.who}</p>
    </li>
  );
}

async function TodayContent() {
  const [summary, fabric] = await Promise.all([getTodaySummary(), getFabricOnHand()]);

  const shown = summary.attention.slice(0, ATTENTION_ROWS);
  const hidden = summary.attention.length - shown.length;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="At a glance"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]"
      >
        <StatTile
          label="Under review"
          tip="Under review means the LPO is created and checked, but no manufacturer has been assigned yet."
          value={String(summary.underReview)}
          help="LPOs waiting for you to assign a manufacturer."
          href="/lpo?filter=under-review"
          linkLabel="Open LPOs"
        />
        <StatTile
          label="With manufacturers"
          tip="Assigned to a manufacturer. The production deadline is the date they should finish by."
          value={String(summary.withManufacturers)}
          help="Assigned, and the production deadline is running."
          href="/lpo?filter=with-manufacturers"
          linkLabel="Open LPOs"
        />
        <StatTile
          label="Overdue"
          tip="An LPO is overdue when a planned date has passed and the step is not done."
          value={String(summary.overdue)}
          valueClassName={
            summary.overdue > 0 ? "text-[#a80f33]" : "text-[var(--foreground)]"
          }
          help="Past an assignment, production or delivery date."
          href="/lpo?filter=overdue"
          linkLabel="See which ones"
        />
        <StatTile
          label="Fabric on hand"
          tip="Metres still available in stock: received, minus issued, plus returned."
          value={formatMeters(fabric.meters)}
          help={`Available across ${fabric.batches} ${fabric.batches === 1 ? "batch" : "batches"}.`}
          href="/fabric"
          linkLabel="Open Fabric"
        />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-6">
          <section className="surface-card" aria-labelledby="needs-h">
            <div className="flex items-center justify-between gap-3 border-b border-[#e6e8e3] px-5 py-[18px]">
              <div className="flex items-center gap-2.5">
                <h2 id="needs-h" className="text-[17px] font-bold">
                  Needs action now
                </h2>
                <Chip tone={summary.attention.length > 0 ? "red" : "green"}>
                  {summary.attention.length}{" "}
                  {summary.attention.length === 1 ? "item" : "items"}
                </Chip>
                <InfoTip label="Why is an order listed here?">
                  An LPO appears here when a review is pending or an assignment,
                  production or client delivery date has passed. Fix it and it leaves this
                  list.
                </InfoTip>
              </div>
              <Link
                href="/lpo"
                className="text-sm font-semibold text-[#2f5639] hover:text-[#1f3d27]"
              >
                See all LPOs
              </Link>
            </div>
            {shown.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing needs action right now">
                  Every open LPO is on track.
                </EmptyState>
              </div>
            ) : (
              <ul>
                {shown.map((item) => (
                  <AttentionRow key={item.lpoId} item={item} />
                ))}
              </ul>
            )}
            {hidden > 0 ? (
              <p className="border-t border-[#eef0ea] px-5 py-3 text-sm text-[#4d544d]">
                {hidden} more.{" "}
                <Link
                  href="/lpo"
                  className="font-semibold text-[#2f5639] hover:text-[#1f3d27]"
                >
                  Open the LPO list
                </Link>
              </p>
            ) : null}
          </section>

          <section className="surface-card" aria-labelledby="soon-h">
            <div className="flex items-center gap-2.5 border-b border-[#e6e8e3] px-5 py-[18px]">
              <h2 id="soon-h" className="text-[17px] font-bold">
                Coming up in the next {UPCOMING_DAYS} days
              </h2>
              <InfoTip label="What is shown here?">
                Production and delivery dates set on your LPOs, soonest first.
              </InfoTip>
            </div>
            {summary.upcoming.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing due in the next 7 days">
                  Production deadlines and client deliveries will appear here as they get
                  close.
                </EmptyState>
              </div>
            ) : (
              <ul>
                {summary.upcoming.map((item) => (
                  <UpcomingRow key={`${item.lpoId}-${item.kind}`} item={item} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <section
            className="surface-card flex flex-col gap-3 px-5 py-[18px]"
            aria-labelledby="start-h"
          >
            <h2 id="start-h" className="text-[17px] font-bold">
              Start something
            </h2>
            {START_ACTIONS.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex min-h-11 items-center gap-3.5 rounded-[10px] border border-[var(--border)] p-3 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[var(--brand-muted)]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2f5639"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={action.icon} />
                  </svg>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">{action.title}</span>
                  <span className="text-[13px] leading-snug text-[#4d544d]">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </section>

          <section className="surface-card px-5 py-[18px]">
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <h2 className="text-[17px] font-bold">How an order moves</h2>
                <span className="btn-secondary">
                  <span className="group-open:hidden">Show</span>
                  <span className="hidden group-open:inline">Hide</span>
                </span>
              </summary>
              <ol className="mt-3 flex flex-col gap-2.5">
                {ORDER_STEPS.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[var(--brand)] text-[13px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-snug">
                      <span className="font-semibold">{step.title}</span>
                      <br />
                      <Link
                        href={step.href}
                        className="text-[13px] text-[#2f5639] hover:text-[#1f3d27]"
                      >
                        {step.where}
                      </Link>
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TodayPage() {
  return (
    <PageContainer
      title="Today"
      description={`${todayHeading(new Date())}. What needs your attention right now and what is coming up. Start here each morning, then open the item to act on it.`}
      breadcrumb={[]}
      actions={
        <>
          <Link href="/fabric" className="btn-secondary">
            Receive fabric
          </Link>
          <Link href="/lpo" className="btn-primary">
            New LPO
          </Link>
        </>
      }
    >
      <Suspense fallback={<SectionLoading label="Loading today…" />}>
        <TodayContent />
      </Suspense>
    </PageContainer>
  );
}
