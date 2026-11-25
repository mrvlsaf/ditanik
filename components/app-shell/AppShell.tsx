"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/app/auth-actions";
import { PandaMark } from "@/components/brand/PandaMark";
import { APP_NAV_GROUPS, activeNavItem } from "@/lib/navigation";

function NavIcon({ path }: Readonly<{ path: string }>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nav-icon shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

function NavLinks({
  onNavigate,
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const current = activeNavItem(pathname);

  return (
    <nav aria-label="Main menu" className="flex flex-col gap-5 p-3">
      {APP_NAV_GROUPS.map((group) => (
        <div key={group.title ?? "top"} className="flex flex-col gap-1">
          {group.title ? <p className="nav-group-title">{group.title}</p> : null}
          {group.items.map((item) => {
            const isActive = current?.href === item.href;
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
                  onNavigate?.();
                }}
                className={linkClass}
                aria-current={isActive ? "page" : undefined}
                aria-busy={isPending || undefined}
              >
                <NavIcon path={item.icon} />
                <span>{item.label}</span>
                {isPending ? (
                  <span className="ml-auto inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--sidebar-active)]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  return (
    <div className="shrink-0 border-t border-white/10 p-3">
      <p className="px-3 text-sm font-semibold text-[var(--sidebar-fg)]">Need a hand?</p>
      <p className="mt-1 px-3 text-xs leading-relaxed text-[var(--sidebar-muted)]">
        Look for the (i) icons. They explain a term where you meet it.
      </p>
      <Link
        href="/help"
        onClick={onNavigate}
        className="nav-link mt-1 font-semibold text-[var(--sidebar-active)]"
      >
        Open the guide &rarr;
      </Link>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="shrink-0 border-b border-white/10 px-4 py-4">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
      >
        <PandaMark className="h-9 w-9 shrink-0" title="Ditanik" />
        <span>Ditanik</span>
      </Link>
      <p className="mt-1 pl-[2.625rem] text-[10px] tracking-[0.2em] text-[var(--sidebar-muted)] uppercase">
        Operations
      </p>
    </div>
  );
}

function AppTopBar({
  workspaceSlot,
  notificationSlot,
  userEmail,
  onOpenMobileMenu,
}: Readonly<{
  workspaceSlot: React.ReactNode;
  notificationSlot: React.ReactNode;
  userEmail: string;
  onOpenMobileMenu: () => void;
}>) {
  return (
    <header className="app-header sticky top-0 z-30">
      <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="btn-secondary inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center lg:hidden"
            aria-label="Open menu"
            onClick={onOpenMobileMenu}
          >
            <PandaMark className="h-6 w-6" />
          </button>
          <p className="min-w-0 truncate text-sm text-[var(--text-muted)]">
            Workspace:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {workspaceSlot}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/help" className="topbar-link">
            Help
          </Link>
          {notificationSlot}
          <span
            className="hidden max-w-[14rem] truncate text-xs text-[var(--text-muted)] xl:inline"
            title={userEmail}
          >
            {userEmail}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="topbar-link">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

/** Shared chrome: grouped sidebar + slim top bar (workspace, help, bell, sign out). */
export function AppShell({
  children,
  userEmail,
  notificationSlot,
  workspaceSlot,
}: Readonly<{
  children: React.ReactNode;
  userEmail: string;
  notificationSlot: React.ReactNode;
  workspaceSlot: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <aside className="app-sidebar hidden h-dvh w-56 shrink-0 flex-col lg:flex">
        <SidebarBrand />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <SidebarFooter />
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
            <SidebarBrand />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavLinks onNavigate={closeMobileMenu} />
            </div>
            <SidebarFooter onNavigate={closeMobileMenu} />
          </aside>
        </div>
      ) : null}

      <div className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <AppTopBar
          workspaceSlot={workspaceSlot}
          notificationSlot={notificationSlot}
          userEmail={userEmail}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
