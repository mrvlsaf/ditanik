import { LpoStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  LPO_FILTERS,
  lpoFilterWhere,
  lpoListHref,
  pageWindow,
  parseLpoFilter,
  parsePage,
} from "@/modules/lpo/domain/lpo-filters";

const NOW = new Date("2026-11-05T06:00:00.000Z");

describe("parseLpoFilter", () => {
  it("accepts every listed filter", () => {
    for (const filter of LPO_FILTERS) {
      expect(parseLpoFilter(filter.key)).toBe(filter.key);
    }
  });

  it("falls back to all for anything else", () => {
    expect(parseLpoFilter(undefined)).toBe("all");
    expect(parseLpoFilter("nonsense")).toBe("all");
    expect(parseLpoFilter(["overdue", "completed"])).toBe("overdue");
  });
});

describe("parsePage", () => {
  it("reads a whole page number from 1", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2"])).toBe(2);
  });

  it("falls back to 1 for anything else", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("lpoFilterWhere", () => {
  it("does not narrow All", () => {
    expect(lpoFilterWhere("all", NOW)).toEqual({});
  });

  it("filters by status", () => {
    expect(lpoFilterWhere("under-review", NOW)).toEqual({
      status: LpoStatus.UNDER_REVIEW,
    });
    expect(lpoFilterWhere("with-manufacturers", NOW)).toEqual({
      status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
    });
    expect(lpoFilterWhere("completed", NOW)).toEqual({
      status: LpoStatus.CLIENT_DELIVERY_COMPLETED,
    });
  });

  it("treats Overdue as open LPOs with a passed date for their step", () => {
    expect(lpoFilterWhere("overdue", NOW)).toEqual({
      status: { not: LpoStatus.CLIENT_DELIVERY_COMPLETED },
      OR: [
        { clientDeliveryAt: { lt: NOW } },
        {
          status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
          productionDeadlineAt: { lt: NOW },
        },
        {
          status: LpoStatus.UNDER_REVIEW,
          manufacturerAssignmentAt: { lt: NOW },
        },
      ],
    });
  });
});

describe("pageWindow", () => {
  it("describes the first page", () => {
    expect(pageWindow(1, 53, 25)).toEqual({
      page: 1,
      totalPages: 3,
      from: 1,
      to: 25,
      skip: 0,
    });
  });

  it("describes a short last page", () => {
    expect(pageWindow(3, 53, 25)).toMatchObject({ from: 51, to: 53, skip: 50 });
  });

  it("keeps a page that is too high within range", () => {
    expect(pageWindow(99, 53, 25).page).toBe(3);
    expect(pageWindow(0, 53, 25).page).toBe(1);
  });

  it("handles an empty list", () => {
    expect(pageWindow(1, 0, 25)).toEqual({
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
      skip: 0,
    });
  });
});

describe("lpoListHref", () => {
  it("leaves out defaults", () => {
    expect(lpoListHref("all")).toBe("/lpo");
    expect(lpoListHref("all", 1)).toBe("/lpo");
  });

  it("carries the filter and page", () => {
    expect(lpoListHref("overdue")).toBe("/lpo?filter=overdue");
    expect(lpoListHref("overdue", 2)).toBe("/lpo?filter=overdue&page=2");
    expect(lpoListHref("all", 3)).toBe("/lpo?page=3");
  });
});
