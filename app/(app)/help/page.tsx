import { PageContainer } from "@/components/app-shell/PageContainer";
import { HelpTopic } from "@/components/help/HelpTopic";
import {
  HELP_SECTIONS,
  HelpOpenLink,
  HelpTocLink,
  type HelpSection,
} from "@/components/help/help-content";

function StepList({ section }: Readonly<{ section: HelpSection }>) {
  return (
    <ol className="flex flex-col gap-3.5">
      {section.steps.map((step, index) => (
        <li key={step.title} className="flex flex-wrap items-start gap-3.5">
          <span
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white"
            aria-hidden
          >
            {index + 1}
          </span>
          <span className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
            <span className="text-[15px] font-bold">{step.title}</span>
            <span className="text-sm leading-relaxed text-[#3a413a]">{step.detail}</span>
          </span>
          {step.href ? (
            <HelpOpenLink href={step.href} asButton>
              Open
            </HelpOpenLink>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Tips({ tips }: Readonly<{ tips: string[] }>) {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        Tips
      </p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#3a413a]">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HelpPage() {
  const quickStart = HELP_SECTIONS.find((section) => section.id === "quick-start");
  const topics = HELP_SECTIONS.filter((section) => section.id !== "quick-start");

  return (
    <PageContainer
      title="Help"
      description="A short guide to every part of Ditanik. Start with the quick start the first time. After that, open any topic when you need it."
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Help" }]}
    >
      <div className="flex flex-wrap items-start gap-6">
        <nav
          aria-label="Help topics"
          className="surface-card flex min-w-[220px] flex-[0_1_260px] flex-col gap-0.5 p-3 lg:sticky lg:top-24"
        >
          <p className="px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
            Topics
          </p>
          {HELP_SECTIONS.map((section) => (
            <HelpTocLink key={section.id} section={section} />
          ))}
        </nav>

        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          {quickStart ? (
            <section
              id={quickStart.id}
              className="surface-card flex scroll-mt-24 flex-col gap-4 p-5"
              aria-labelledby="quick-start-title"
            >
              <div>
                <h2 id="quick-start-title" className="text-xl font-bold">
                  Quick start
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {quickStart.summary}
                </p>
              </div>
              <StepList section={quickStart} />
              {quickStart.tips?.length ? <Tips tips={quickStart.tips} /> : null}
            </section>
          ) : null}

          <section className="surface-card overflow-hidden" aria-label="More topics">
            {topics.map((section, index) => (
              <HelpTopic
                key={section.id}
                id={section.id}
                title={section.title}
                defaultOpen={index === 0}
              >
                <p className="text-sm leading-relaxed text-[#3a413a]">
                  {section.summary}
                </p>
                <StepList section={section} />
                {section.tips?.length ? <Tips tips={section.tips} /> : null}
              </HelpTopic>
            ))}
          </section>

          <p className="text-center text-xs text-[var(--text-muted)]">
            Product rules also live in docs (FLOW / DECISIONS / QA) for developers. This
            Help page is the operator-facing guide.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
