import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isEmailAllowlisted } from "@/lib/auth/allowlist";

type AppRole = "ADMIN";

function isAppRole(value: unknown): value is AppRole {
  return value === "ADMIN";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !isEmailAllowlisted(user.email)) {
        return "/login?error=AccessDenied";
      }

      // Dynamic import keeps Prisma out of Edge middleware bundle.
      const { prisma } = await import("@/lib/db");

      await prisma.user.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          name: user.name ?? null,
          googleSub: account?.providerAccountId ?? null,
          role: "ADMIN",
        },
        update: {
          name: user.name ?? null,
          googleSub: account?.providerAccountId ?? null,
        },
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const { prisma } = await import("@/lib/db");
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const userId = token.userId;
      const role = token.role;

      if (session.user && typeof userId === "string" && isAppRole(role)) {
        session.user.id = userId;
        session.user.role = role;
      }
      return session;
    },
  },
  trustHost: true,
});
