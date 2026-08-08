import { PrismaClient } from "@prisma/client";

import {
  DatabaseUnavailableError,
  isDbUnreachableError,
} from "@/lib/db-errors";

const MAX_CONNECT_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createPrismaClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastError: unknown;

          for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;

              if (
                !isDbUnreachableError(error) ||
                attempt === MAX_CONNECT_ATTEMPTS
              ) {
                break;
              }

              // Neon compute often needs a short wake window after scale-to-zero.
              await sleep(1000 * attempt);

              try {
                await base.$connect();
              } catch {
                // Next query attempt will surface the real failure.
              }
            }
          }

          if (isDbUnreachableError(lastError)) {
            throw new DatabaseUnavailableError();
          }

          throw lastError;
        },
      },
    },
  });
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

/** Single Prisma client for the Next.js process (avoids hot-reload duplicates). */
const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
