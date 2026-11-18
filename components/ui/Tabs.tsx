"use client";

import { useId, useRef, useState } from "react";

import { nextTabIndex, resolveActiveTab } from "@/lib/tabs";

export type TabItem = {
  id: string;
  label: string;
  /** Small number beside the label, for example how many rows the tab holds. */
  count?: number | string;
  content: React.ReactNode;
};

/**
 * Tabs that keep every panel mounted, only hiding the ones not in view, so a
 * half-filled form is still filled in after switching tabs and back.
 *
 * Works with the keyboard (arrows, Home, End). Pass `syncParam` to keep the
 * open tab in the address (?tab=...) so a refresh or shared link lands on it;
 * the server page reads the same parameter and passes it as `defaultId`.
 */
export function Tabs({
  label,
  tabs,
  defaultId,
  syncParam,
  onChange,
}: Readonly<{
  /** Accessible name for the tab list, for example "LPO sections". */
  label: string;
  tabs: readonly TabItem[];
  defaultId?: string;
  syncParam?: string;
  onChange?: (id: string) => void;
}>) {
  const baseId = useId();
  const ids = tabs.map((tab) => tab.id);
  const [selected, setSelected] = useState<string | null>(defaultId ?? null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = resolveActiveTab(ids, selected);

  if (!active) {
    return null;
  }

  function select(id: string) {
    setSelected(id);
    onChange?.(id);
    if (syncParam && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set(syncParam, id);
      window.history.replaceState(window.history.state, "", url);
    }
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const next = nextTabIndex(index, event.key, tabs.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    const nextTab = tabs[next];
    if (!nextTab) {
      return;
    }
    select(nextTab.id);
    tabRefs.current[next]?.focus();
  }

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  return (
    <div>
      <div className="tab-list" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={isActive}
              aria-controls={panelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? "tab tab-on" : "tab"}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span>{tab.label}</span>
              {tab.count === undefined || tab.count === "" ? null : (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={panelId(tab.id)}
          aria-labelledby={tabId(tab.id)}
          hidden={tab.id !== active}
          className="pt-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
