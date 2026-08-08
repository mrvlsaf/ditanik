import { NextResponse } from "next/server";

import { auth } from "@/auth";

/** Protect app pages; allow login, NextAuth, and cron (secret checked in route). */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.auth;
  const isLoginPage = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isCronApi = pathname.startsWith("/api/cron/");

  if (isAuthApi || isCronApi) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");
  if (!isLoggedIn && isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/lpo", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
