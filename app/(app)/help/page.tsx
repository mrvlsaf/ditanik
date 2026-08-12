import { PageContainer } from "@/components/app-shell/PageContainer";
import {
  HELP_SECTIONS,
  HelpOpenLink,
  HelpTocLink,
} from "@/components/help/help-content";

export default function HelpPage() {
  return (
    <PageContainer
      title="Help"
      description="Knowledge base and user flows for operating Ditanik — LPO, fabric, manufacturers, and notifications."
    >
      <div className="gap-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="mb-8 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              On this page
            </p>
            <nav
              aria-label="Help sections"
              className="surface-card py-2"
            >
              {HELP_SECTIONS.map((section) => (
                <HelpTocLink key={section.id} section={section} />
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-10">
          <section className="surface-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-zinc-900">
              How to use this guide
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Start with <strong className="font-medium text-zinc-800">Quick start</strong>{" "}
              if you are new. Each section below is a user flow: what to do, in
              order, with links into the live screens. Tips call out rules that
              commonly block progress (required PDFs, date reasons, stock
              limits).
            </p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              <li>
                Set up{" "}
                <HelpOpenLink href="/consumption">Consumption</HelpOpenLink> and{" "}
                <HelpOpenLink href="/manufacturers">Manufacturers</HelpOpenLink>
              </li>
              <li>
                Run an{" "}
                <HelpOpenLink href="/lpo">LPO</HelpOpenLink> from create → assign
                → complete
              </li>
              <li>
                Keep stock moving on{" "}
                <HelpOpenLink href="/fabric">Fabric</HelpOpenLink> and check{" "}
                <HelpOpenLink href="/invoices">Invoices</HelpOpenLink>
              </li>
              <li>
                Use the bell /{" "}
                <HelpOpenLink href="/notifications">Notifications</HelpOpenLink>{" "}
                for due work
              </li>
            </ol>
          </section>

          {HELP_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 surface-card p-4 sm:p-6"
            >
              <h2 className="text-base font-semibold text-zinc-900">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {section.summary}
              </p>

              <ol className="mt-5 space-y-4">
                {section.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-zinc-900">
                        {step.title}
                        {step.href ? (
                          <>
                            {" "}
                            ·{" "}
                            <HelpOpenLink href={step.href}>Open</HelpOpenLink>
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {section.tips && section.tips.length > 0 ? (
                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Tips
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-600">
                    {section.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}

          <p className="text-center text-xs text-zinc-400">
            Product rules also live in docs (FLOW / DECISIONS / QA) for
            developers. This Help page is the operator-facing guide.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
