import { describe, expect, it } from "vitest";

import {
  extensionLabel,
  initialDetailTab,
  isExtended,
  nextStepFor,
  parseDetailTab,
  primaryActionFor,
  progressSteps,
  tabForAction,
} from "@/modules/lpo/domain/lpo-detail";

describe("detail tabs", () => {
  it("parses known tabs only", () => {
    expect(parseDetailTab("dates")).toBe("dates");
    expect(parseDetailTab("nope")).toBeNull();
    expect(parseDetailTab(undefined)).toBeNull();
  });

  it("maps notification actions to the tab that holds the work", () => {
    expect(tabForAction("assign")).toBe("production");
    expect(tabForAction("complete")).toBe("production");
    expect(tabForAction("dates")).toBe("dates");
    expect(tabForAction(null)).toBeNull();
  });

  it("lets an explicit tab win over the action, defaulting to summary", () => {
    expect(initialDetailTab("documents", "assign")).toBe("documents");
    expect(initialDetailTab(null, "dates")).toBe("dates");
    expect(initialDetailTab("bogus", "assign")).toBe("production");
    expect(initialDetailTab(null, null)).toBe("summary");
  });
});

describe("progress and next step", () => {
  it("marks review as the current step", () => {
    expect(progressSteps("UNDER_REVIEW").map((s) => s.state)).toEqual([
      "done",
      "current",
      "todo",
      "todo",
    ]);
    expect(progressSteps("LPO_RECEIVED")).toEqual(progressSteps("UNDER_REVIEW"));
  });

  it("marks assigned and delivered correctly", () => {
    expect(progressSteps("ASSIGNED_TO_MANUFACTURER").map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "todo",
    ]);
    expect(
      progressSteps("CLIENT_DELIVERY_COMPLETED").every((s) => s.state === "done"),
    ).toBe(true);
  });

  it("gives each status its own next step and header action", () => {
    expect(nextStepFor("UNDER_REVIEW").title).toBe("Assign a manufacturer");
    expect(nextStepFor("ASSIGNED_TO_MANUFACTURER").title).toContain(
      "mark client delivery",
    );
    expect(nextStepFor("CLIENT_DELIVERY_COMPLETED").title).toContain("tax invoice");
    expect(primaryActionFor("UNDER_REVIEW")).toEqual({
      label: "Assign manufacturer",
      tab: "production",
    });
    expect(primaryActionFor("CLIENT_DELIVERY_COMPLETED").tab).toBe("documents");
  });
});

describe("date extensions", () => {
  const changes = [
    { field: "PRODUCTION_DEADLINE" },
    { field: "PRODUCTION_DEADLINE" },
    { field: "CLIENT_DELIVERY" },
  ];

  it("labels original, once and many", () => {
    expect(extensionLabel(changes, "ASSIGNMENT")).toBe("Original date");
    expect(extensionLabel(changes, "CLIENT_DELIVERY")).toBe("Extended once");
    expect(extensionLabel(changes, "PRODUCTION_DEADLINE")).toBe("Extended 2 times");
  });

  it("detects whether a field was extended", () => {
    expect(isExtended(changes, "ASSIGNMENT")).toBe(false);
    expect(isExtended(changes, "CLIENT_DELIVERY")).toBe(true);
  });
});
