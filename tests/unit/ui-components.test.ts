import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Chip, CHIP_TONES, CHIP_TONE_CLASS } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { Tabs } from "@/components/ui/Tabs";

/** createElement with children as extra arguments, whatever the props type. */
const h = createElement as (
  type: unknown,
  props: object | null,
  ...children: unknown[]
) => ReactElement;

describe("Chip", () => {
  it("has a class for every tone", () => {
    for (const tone of CHIP_TONES) {
      expect(CHIP_TONE_CLASS[tone]).toContain(`chip-${tone}`);
    }
  });

  it("shows its text label", () => {
    const html = renderToStaticMarkup(h(Chip, { tone: "amber" }, "Under review"));
    expect(html).toContain("Under review");
    expect(html).toContain("chip-amber");
  });
});

describe("EmptyState", () => {
  it("shows the title, the help text and the action", () => {
    const html = renderToStaticMarkup(
      h(
        EmptyState,
        { title: "No LPOs yet", action: createElement("a", { href: "/lpo" }, "New LPO") },
        "Create the first one.",
      ),
    );
    expect(html).toContain("No LPOs yet");
    expect(html).toContain("Create the first one.");
    expect(html).toContain("New LPO");
  });

  it("works with only a title", () => {
    const html = renderToStaticMarkup(h(EmptyState, { title: "Nothing here" }));
    expect(html).toContain("Nothing here");
  });
});

describe("InfoTip", () => {
  it("is a named button linked to a tooltip", () => {
    const html = renderToStaticMarkup(
      h(InfoTip, { label: "What is a nickname?" }, "A short name."),
    );
    expect(html).toContain('aria-label="What is a nickname?"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("A short name.");
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
  });

  it("starts closed", () => {
    const html = renderToStaticMarkup(h(InfoTip, { label: "Help" }, "Text"));
    expect(html).toContain("hidden");
  });
});

describe("Tabs", () => {
  const tabs = [
    { id: "one", label: "One", content: createElement("p", null, "First panel") },
    {
      id: "two",
      label: "Two",
      count: 3,
      content: createElement("p", null, "Second panel"),
    },
  ];

  it("shows the first tab by default and keeps the others mounted but hidden", () => {
    const html = renderToStaticMarkup(h(Tabs, { label: "Sections", tabs }));
    expect(html).toContain('role="tablist"');
    expect(html).toContain("First panel");
    expect(html).toContain("Second panel");
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/hidden=""/g)).toHaveLength(1);
  });

  it("opens the tab asked for", () => {
    const html = renderToStaticMarkup(
      h(Tabs, { label: "Sections", tabs, defaultId: "two" }),
    );
    expect(/id="[^"]*-tab-two"[^>]*aria-selected="true"/.test(html)).toBe(true);
  });

  it("shows a count beside the label", () => {
    const html = renderToStaticMarkup(h(Tabs, { label: "Sections", tabs }));
    expect(html).toContain('<span class="tab-count">3</span>');
  });

  it("falls back to the first tab when the requested one does not exist", () => {
    const html = renderToStaticMarkup(
      h(Tabs, { label: "Sections", tabs, defaultId: "missing" }),
    );
    expect(/id="[^"]*-tab-one"[^>]*aria-selected="true"/.test(html)).toBe(true);
  });

  it("renders nothing without tabs", () => {
    const html = renderToStaticMarkup(h(Tabs, { label: "Sections", tabs: [] }));
    expect(html).toBe("");
  });
});
