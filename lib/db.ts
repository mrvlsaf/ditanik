import { PrismaClient } from "@prisma/client";

/** Single Prisma client for the Next.js process (avoids hot-reload duplicates). */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
