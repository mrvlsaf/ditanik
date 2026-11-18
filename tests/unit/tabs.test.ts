import { describe, expect, it } from "vitest";

import { nextTabIndex, resolveActiveTab } from "@/lib/tabs";

describe("nextTabIndex", () => {
  it("moves right and wraps from the last tab to the first", () => {
    expect(nextTabIndex(0, "ArrowRight", 4)).toBe(1);
    expect(nextTabIndex(3, "ArrowRight", 4)).toBe(0);
  });

  it("moves left and wraps from the first tab to the last", () => {
    expect(nextTabIndex(2, "ArrowLeft", 4)).toBe(1);
    expect(nextTabIndex(0, "ArrowLeft", 4)).toBe(3);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextTabIndex(2, "Home", 5)).toBe(0);
    expect(nextTabIndex(1, "End", 5)).toBe(4);
  });

  it("ignores other keys and empty tab lists", () => {
    expect(nextTabIndex(1, "Enter", 4)).toBeNull();
    expect(nextTabIndex(1, "a", 4)).toBeNull();
    expect(nextTabIndex(0, "ArrowRight", 0)).toBeNull();
  });
});

describe("resolveActiveTab", () => {
  it("uses the requested tab when it exists", () => {
    expect(resolveActiveTab(["a", "b", "c"], "b")).toBe("b");
  });

  it("falls back to the first tab for a missing or unknown tab", () => {
    expect(resolveActiveTab(["a", "b"], undefined)).toBe("a");
    expect(resolveActiveTab(["a", "b"], null)).toBe("a");
    expect(resolveActiveTab(["a", "b"], "zzz")).toBe("a");
  });

  it("returns null when there are no tabs", () => {
    expect(resolveActiveTab([], "a")).toBeNull();
  });
});
