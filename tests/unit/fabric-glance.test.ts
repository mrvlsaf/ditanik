import { describe, expect, it } from "vitest";

import {
  formatMeters,
  formatSignedMeters,
  issuedOutMeters,
  movementLabel,
  movementTone,
  pluralise,
  startOfBusinessMonth,
} from "@/modules/fabric/domain/fabric-glance";

describe("issuedOutMeters", () => {
  it("is issued minus returned", () => {
    expect(issuedOutMeters({ ISSUED: -500, RETURNED: 90 })).toBe(410);
  });

  it("never goes below zero", () => {
    expect(issuedOutMeters({ ISSUED: -10, RETURNED: 40 })).toBe(0);
    expect(issuedOutMeters({})).toBe(0);
  });

  it("avoids floating point noise", () => {
    expect(issuedOutMeters({ ISSUED: -0.3, RETURNED: 0.1 })).toBe(0.2);
  });
});

describe("meter formatting", () => {
  it("groups thousands and trims zeros", () => {
    expect(formatMeters(1240)).toBe("1,240 m");
    expect(formatMeters(12.5)).toBe("12.5 m");
    expect(formatMeters(0)).toBe("0 m");
  });

  it("signs movements", () => {
    expect(formatSignedMeters(300)).toBe("+300 m");
    expect(formatSignedMeters(-56)).toBe("-56 m");
    expect(formatSignedMeters(0)).toBe("0 m");
  });
});

describe("startOfBusinessMonth", () => {
  it("is midnight on the 1st in Dubai", () => {
    expect(startOfBusinessMonth(new Date("2026-11-15T10:00:00Z")).toISOString()).toBe(
      "2026-10-31T20:00:00.000Z",
    );
  });

  it("uses the Dubai date near a month boundary", () => {
    // 21:00 UTC on 30 Nov is already 1 Dec in Dubai.
    expect(startOfBusinessMonth(new Date("2026-11-30T21:00:00Z")).toISOString()).toBe(
      "2026-11-30T20:00:00.000Z",
    );
  });
});

describe("movement labels", () => {
  it("names and colours each type", () => {
    expect(movementLabel("ISSUED")).toBe("Issued");
    expect(movementTone("RECEIVED")).toBe("green");
    expect(movementTone("RETURNED")).toBe("amber");
    expect(movementLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(movementTone("SOMETHING_NEW")).toBe("gray");
  });

  it("pluralises", () => {
    expect(pluralise(1, "batch", "batches")).toBe("1 batch");
    expect(pluralise(3, "batch", "batches")).toBe("3 batches");
    expect(pluralise(2, "invoice")).toBe("2 invoices");
  });
});
