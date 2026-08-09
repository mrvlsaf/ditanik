import { LpoDateField, LpoStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertCanAssignManufacturer,
  assertCanMarkClientDeliveryCompleted,
  canAssignManufacturer,
  canMarkClientDeliveryCompleted,
  initialStatusAfterCreate,
  lpoStatusLabel,
} from "@/modules/lpo/domain/lpo-status";
import {
  DEFAULT_ASSIGNMENT_DAYS,
  DEFAULT_CLIENT_DELIVERY_DAYS,
  DEFAULT_PRODUCTION_DEADLINE_DAYS,
  assertDateChangeReason,
  calculateDueAtFromReceivedDate,
  defaultLpoDatesFromReceived,
  isReasonRequiredForDateField,
  isReceivedDateAllowed,
} from "@/modules/lpo/domain/due-dates";
import {
  calculateAdditionalFabricRequired,
  calculateExpectedMeters,
  calculateStockFromMovements,
  calculateVarianceDifference,
} from "@/modules/fabric/domain/meters";
import { normalizeManufacturerName } from "@/modules/manufacturer/domain/normalize";

describe("lpo status hybrid machine", () => {
  it("auto-selects Under Review after create", () => {
    expect(initialStatusAfterCreate()).toBe(LpoStatus.UNDER_REVIEW);
  });

  it("allows assign only while Under Review", () => {
    expect(
      canAssignManufacturer({
        status: LpoStatus.UNDER_REVIEW,
        productionFileKey: null,
        manufacturerId: null,
      }),
    ).toBe(true);
    expect(
      canAssignManufacturer({
        status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
        productionFileKey: "x",
        manufacturerId: "m",
      }),
    ).toBe(false);
  });

  it("requires assignment + production file before client delivery complete", () => {
    expect(
      canMarkClientDeliveryCompleted({
        status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
        productionFileKey: "prod.pdf",
        manufacturerId: "m1",
      }),
    ).toBe(true);
    expect(() =>
      assertCanMarkClientDeliveryCompleted({
        status: LpoStatus.UNDER_REVIEW,
        productionFileKey: null,
        manufacturerId: null,
      }),
    ).toThrow(/assigned/i);
  });

  it("maps Assigned dashboard label to Production Deadline", () => {
    expect(lpoStatusLabel(LpoStatus.ASSIGNED_TO_MANUFACTURER)).toBe(
      "Production Deadline",
    );
  });

  it("throws when assigning from wrong status", () => {
    expect(() =>
      assertCanAssignManufacturer({
        status: LpoStatus.CLIENT_DELIVERY_COMPLETED,
        productionFileKey: "x",
        manufacturerId: "m",
      }),
    ).toThrow(/Under Review/i);
  });
});

describe("lpo date defaults", () => {
  it("uses +2 / +12 / +15 defaults", () => {
    expect(DEFAULT_ASSIGNMENT_DAYS).toBe(2);
    expect(DEFAULT_PRODUCTION_DEADLINE_DAYS).toBe(12);
    expect(DEFAULT_CLIENT_DELIVERY_DAYS).toBe(15);

    const received = new Date("2026-08-10T12:00:00.000Z");
    const dates = defaultLpoDatesFromReceived(received);
    expect(dates.manufacturerAssignmentAt).toEqual(
      calculateDueAtFromReceivedDate(received, 2),
    );
    expect(dates.productionDeadlineAt).toEqual(
      calculateDueAtFromReceivedDate(received, 12),
    );
    expect(dates.clientDeliveryAt).toEqual(
      calculateDueAtFromReceivedDate(received, 15),
    );
  });

  it("requires reason for assignment and production deadline only", () => {
    expect(isReasonRequiredForDateField(LpoDateField.ASSIGNMENT)).toBe(true);
    expect(isReasonRequiredForDateField(LpoDateField.PRODUCTION_DEADLINE)).toBe(
      true,
    );
    expect(isReasonRequiredForDateField(LpoDateField.CLIENT_DELIVERY)).toBe(
      false,
    );

    expect(() =>
      assertDateChangeReason(LpoDateField.ASSIGNMENT, "short"),
    ).toThrow(/Reason is required/i);
    expect(() =>
      assertDateChangeReason(LpoDateField.CLIENT_DELIVERY, ""),
    ).not.toThrow();
  });

  it("blocks future received dates", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    expect(isReceivedDateAllowed(tomorrow)).toBe(false);
  });
});

describe("fabric meters domain", () => {
  it("sums signed movements for stock", () => {
    expect(
      calculateStockFromMovements([
        { quantityMeters: 1000 },
        { quantityMeters: -600 },
        { quantityMeters: 50 },
      ]),
    ).toBe(450);
  });

  it("calculates expected meters and variance", () => {
    expect(calculateExpectedMeters(100, 1.8)).toBe(180);
    expect(calculateVarianceDifference(500, 540)).toBe(40);
    expect(calculateAdditionalFabricRequired(500, 200)).toBe(300);
    expect(calculateAdditionalFabricRequired(200, 500)).toBe(0);
  });
});

describe("manufacturer normalize", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeManufacturerName("  XYZ   Garments ")).toBe("xyz garments");
  });
});
