/** Stable message thrown after Neon/Prisma connect retries fail (safe for error UI). */
export const DATABASE_UNAVAILABLE_MESSAGE = "DATABASE_UNAVAILABLE";

export class DatabaseUnavailableError extends Error {
  readonly code = "DB_UNAVAILABLE";

  constructor() {
    super(DATABASE_UNAVAILABLE_MESSAGE);
    this.name = "DatabaseUnavailableError";
  }
}

/** True for Prisma/Neon "can't reach host" style failures (e.g. sleeping compute). */
export function isDbUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    name?: string;
  };

  if (
    candidate.code === "P1001" ||
    candidate.code === "P1017" ||
    candidate.code === "P1002"
  ) {
    return true;
  }

  const message = candidate.message ?? "";
  return (
    message.includes("Can't reach database server") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection timed out") ||
    message.includes("Timed out fetching a new connection")
  );
}

/** True when the UI should show the “database waking up” recovery message. */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    name?: string;
  };

  if (
    candidate.name === "DatabaseUnavailableError" ||
    candidate.code === "DB_UNAVAILABLE" ||
    candidate.message === DATABASE_UNAVAILABLE_MESSAGE
  ) {
    return true;
  }

  return isDbUnreachableError(error);
}
