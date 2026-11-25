import { describe, expect, it } from "vitest";

import {
  fabricSentSubtitle,
  summariseLedgerGlance,
  varianceReasonLabel,
} from "@/modules/fabric/domain/ledger-glance";

describe("summariseLedgerGlance", () => {
  it("adds up LPO sections and additional fabric", () => {
    const glance = summariseLedgerGlance(
      [
        { totalSent: 56, totalExpectedBalance: 22 },
        { totalSent: 90, totalExpectedBalance: 28 },
      ],
      { totalSent: 20, totalExpectedBalance: 20 },
    );
    expect(glance).toEqual({
      fabricSentMeters: 166,
      expectedOnHandMeters: 70,
      lposWithFabric: 2,
    });
  });

  it("is zero for a manufacturer with nothing sent", () => {
    expect(summariseLedgerGlance([], { totalSent: 0, totalExpectedBalance: 0 })).toEqual({
      fabricSentMeters: 0,
      expectedOnHandMeters: 0,
      lposWithFabric: 0,
    });
  });

  it("avoids floating point noise", () => {
    const glance = summariseLedgerGlance(
      [{ totalSent: 0.1, totalExpectedBalance: 0.1 }],
      { totalSent: 0.2, totalExpectedBalance: 0.2 },
    );
    expect(glance.fabricSentMeters).toBe(0.3);
  });
});

describe("fabricSentSubtitle", () => {
  it("describes where the fabric went", () => {
    expect(
      fabricSentSubtitle(
        { fabricSentMeters: 1, expectedOnHandMeters: 1, lposWithFabric: 2 },
        true,
      ),
    ).toBe("Across 2 LPOs and additional fabric");
    expect(
      fabricSentSubtitle(
        { fabricSentMeters: 1, expectedOnHandMeters: 1, lposWithFabric: 1 },
        false,
      ),
    ).toBe("Across 1 LPO");
    expect(
      fabricSentSubtitle(
        { fabricSentMeters: 1, expectedOnHandMeters: 1, lposWithFabric: 0 },
        true,
      ),
    ).toBe("Additional fabric only");
    expect(
      fabricSentSubtitle(
        { fabricSentMeters: 0, expectedOnHandMeters: 0, lposWithFabric: 0 },
        false,
      ),
    ).toBe("Nothing sent yet");
  });
});

describe("varianceReasonLabel", () => {
  it("names the known reasons and tidies unknown ones", () => {
    expect(varianceReasonLabel("CUTTING_WASTAGE")).toBe("Cutting wastage");
    expect(varianceReasonLabel("NEW_REASON")).toBe("new reason");
  });
});
