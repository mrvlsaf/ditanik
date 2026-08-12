"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/app/auth-actions";
import {
  PageHeaderProvider,
  usePageHeader,
} from "@/components/app-shell/page-header-context";
import { PandaMark } from "@/components/brand/PandaMark";
import { APP_NAV_ITEMS } from "@/lib/navigation";

function NavLinks({
  onNavigate,
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();
  const { setHeader } = usePageHeader();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {APP_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isPending = pendingHref === item.href && !isActive;

        let linkClass = "nav-link";
        if (isActive) {
          linkClass += " nav-link-active";
        } else if (isPending) {
          linkClass += " nav-link-pending";
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => {
              if (isActive && pathname === item.href) {
                return;
              }
              setPendingHref(item.href);
              setHeader({ title: item.label });
              onNavigate?.();
            }}
            className={linkClass}
            aria-current={isActive ? "page" : undefined}
            aria-busy={isPending || undefined}
          >
            {item.label}
            {isPending ? (
              <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--sidebar-active)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({
  userEmail,
}: Readonly<{
  userEmail: string;
}>) {
  return (
    <div className="shrink-0 border-t border-white/10 p-3">
      <p
        className="truncate px-1 text-xs text-[var(--sidebar-muted)]"
        title={userEmail}
      >
        {userEmail}
      </p>
      <form action={signOutAction} className="mt-2">
        <button type="submit" className="btn-ghost min-h-10 w-full justify-start text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]">
          Sign out
        </button>
      </form>
    </div>
  );
}

function AppTopHeader({
  notificationSlot,
  onOpenMobileMenu,
}: Readonly<{
  notificationSlot: React.ReactNode;
  onOpenMobileMenu: () => void;
}>) {
  const { header } = usePageHeader();

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            className="btn-secondary mt-0.5 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center lg:hidden"
            aria-label="Open menu"
            onClick={onOpenMobileMenu}
          >
            <PandaMark className="h-6 w-6" />
          </button>
          <div className="min-w-0 pt-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              {header.title || "Ditanik"}
            </h1>
            {header.description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                {header.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">{notificationSlot}</div>
      </div>
    </header>
  );
}

/** Shared chrome: sidebar nav + top header with page title and notifications. */
export function AppShell({
  children,
  userEmail,
  notificationSlot,
}: Readonly<{
  children: React.ReactNode;
  userEmail: string;
  notificationSlot: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <PageHeaderProvider>
      <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <aside className="app-sidebar hidden h-dvh w-56 shrink-0 flex-col lg:flex">
          <div className="shrink-0 border-b border-white/10 px-4 py-4">
            <Link
              href="/lpo"
              className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
            >
              <PandaMark className="h-9 w-9 shrink-0" title="Ditanik" />
              <span>Ditanik</span>
            </Link>
            <p className="mt-1 pl-[2.625rem] text-[10px] tracking-[0.2em] text-[var(--sidebar-muted)] uppercase">
              Operations
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavLinks />
          </div>
          <UserFooter userEmail={userEmail} />
        </aside>

        {isMobileMenuOpen ? (
          <div className="lg:hidden">
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40"
              aria-label="Close menu overlay"
              onClick={closeMobileMenu}
            />
            <aside className="app-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,85vw)] flex-col shadow-lg">
              <div className="shrink-0 border-b border-white/10 px-4 py-4">
                <p className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
                  <PandaMark className="h-9 w-9 shrink-0" title="Ditanik" />
                  <span>Ditanik</span>
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavLinks onNavigate={closeMobileMenu} />
              </div>
              <UserFooter userEmail={userEmail} />
            </aside>
          </div>
        ) : null}

        <div className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <AppTopHeader
            notificationSlot={notificationSlot}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
          {children}
        </div>
      </div>
    </PageHeaderProvider>
  );
}
