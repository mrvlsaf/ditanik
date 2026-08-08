import { describe, expect, it } from "vitest";

import {
  DATABASE_UNAVAILABLE_MESSAGE,
  DatabaseUnavailableError,
  isDatabaseUnavailableError,
  isDbUnreachableError,
} from "@/lib/db-errors";

describe("db errors", () => {
  it("detects Prisma unreachable codes and messages", () => {
    expect(isDbUnreachableError({ code: "P1001" })).toBe(true);
    expect(isDbUnreachableError({ code: "P1017" })).toBe(true);
    expect(
      isDbUnreachableError({
        message: "Can't reach database server at `ep-example.neon.tech:5432`",
      }),
    ).toBe(true);
    expect(isDbUnreachableError({ code: "P2002" })).toBe(false);
    expect(isDbUnreachableError(new Error("validation failed"))).toBe(false);
  });

  it("detects the stable unavailable error for the UI", () => {
    expect(isDatabaseUnavailableError(new DatabaseUnavailableError())).toBe(
      true,
    );
    expect(
      isDatabaseUnavailableError({ message: DATABASE_UNAVAILABLE_MESSAGE }),
    ).toBe(true);
    expect(isDatabaseUnavailableError({ code: "P1001" })).toBe(true);
    expect(isDatabaseUnavailableError(new Error("boom"))).toBe(false);
  });
});
