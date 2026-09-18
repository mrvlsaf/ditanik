import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config — no providers, no Prisma.
 * middleware.ts builds its own lightweight NextAuth instance from this
 * alone, so the Google provider and DB-backed callbacks in auth.ts never
 * get bundled into the Edge Function (which is what pushed it over
 * Vercel's 1MB Hobby limit).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;