import { describe, expect, it } from "vitest";

import {
  APP_NAV_GROUPS,
  APP_NAV_ITEMS,
  activeNavItem,
  navContextForPath,
} from "@/lib/navigation";

describe("grouped navigation", () => {
  it("groups the menu by purpose", () => {
    expect(APP_NAV_GROUPS.map((group) => group.title)).toEqual([
      undefined,
      "Orders",
      "Stock",
      "Setup",
    ]);
  });

  it("has unique destinations, each with an icon", () => {
    const hrefs = APP_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(APP_NAV_ITEMS.every((item) => item.icon.length > 0)).toBe(true);
  });

  it("keeps every existing page reachable from the menu or the top bar", () => {
    const hrefs = APP_NAV_ITEMS.map((item) => item.href);
    for (const href of [
      "/",
      "/lpo",
      "/fabric",
      "/invoices",
      "/manufacturers",
      "/consumption",
      "/documents",
      "/settings/company",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("highlights the item a nested path belongs to", () => {
    expect(activeNavItem("/lpo")?.href).toBe("/lpo");
    expect(activeNavItem("/lpo/abc123")?.href).toBe("/lpo");
    expect(activeNavItem("/lpo/abc123/edit")?.href).toBe("/lpo");
    expect(activeNavItem("/manufacturers/m1")?.href).toBe("/manufacturers");
  });

  it("lights up Documents on its own pages, including the old Convert to PDF address", () => {
    expect(activeNavItem("/documents")?.href).toBe("/documents");
    expect(activeNavItem("/documents/new")?.href).toBe("/documents");
    expect(activeNavItem("/documents/convert")?.href).toBe("/documents");
  });

  it("lights up Today only on the home page", () => {
    expect(activeNavItem("/")?.href).toBe("/");
    expect(activeNavItem("/lpo")?.href).toBe("/lpo");
    expect(navContextForPath("/")?.group).toBeNull();
  });

  it("returns nothing for pages outside the menu", () => {
    expect(activeNavItem("/help")).toBeNull();
    expect(activeNavItem("/notifications")).toBeNull();
    expect(navContextForPath("/help")).toBeNull();
  });

  it("reports the group heading for breadcrumbs", () => {
    expect(navContextForPath("/fabric")?.group).toBe("Stock");
    expect(navContextForPath("/lpo/abc")?.group).toBe("Orders");
    expect(navContextForPath("/settings/company")?.group).toBe("Setup");
  });
});
