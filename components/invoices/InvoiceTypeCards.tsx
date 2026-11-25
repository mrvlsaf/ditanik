"use client";

import { Chip, type ChipTone } from "@/components/ui/Chip";
import { FilterOptionLink, useEffectiveActive } from "@/components/ui/FilterNavigation";

export type InvoiceTypeCard = {
  key: string;
  label: string;
  description: string;
  tone: ChipTone;
  count: number;
  href: string;
  active: boolean;
};

/** The clickable invoice type cards at the top of the Invoices page. */
export function InvoiceTypeCards({
  cards,
}: Readonly<{ cards: readonly InvoiceTypeCard[] }>) {
  const activeStates = useEffectiveActive(cards);

  return (
    <section
      aria-label="Invoice types"
      className="grid [grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-3"
    >
      {cards.map((card, index) => {
        const active = activeStates[index] ?? card.active;
        return (
          <FilterOptionLink
            key={card.key}
            href={card.href}
            active={active}
            className={`flex min-h-11 flex-col items-start gap-1.5 rounded-xl border bg-white px-4 py-3.5 text-left text-[var(--foreground)] hover:bg-[#f7f7f5] ${
              active
                ? "border-2 border-[#1a1a1a] bg-[#fbfbf9] px-[15px] py-[13px]"
                : "border-[#b9beb6]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Chip tone={card.tone}>{card.label}</Chip>
              <span className="text-xl font-bold">{card.count}</span>
            </span>
            <span className="text-[13px] leading-snug text-[#4d544d]">
              {card.description}
            </span>
          </FilterOptionLink>
        );
      })}
    </section>
  );
}
