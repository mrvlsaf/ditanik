"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { APP_NAV_ITEMS } from "@/lib/navigation";

function NavLinks({
  onNavigate,
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {APP_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Shared chrome: sidebar on lg+, drawer menu on smaller screens. */
export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-zinc-200 px-4 py-4">
          <Link href="/lpo" className="text-lg font-semibold tracking-tight text-zinc-900">
            Ditanik
          </Link>
        </div>
        <NavLinks />
      </aside>

      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/lpo" className="text-base font-semibold tracking-tight text-zinc-900">
          Ditanik
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-200 text-zinc-800"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close menu overlay"
            onClick={closeMobileMenu}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-white shadow-lg">
            <div className="border-b border-zinc-200 px-4 py-4">
              <p className="text-lg font-semibold tracking-tight text-zinc-900">Ditanik</p>
            </div>
            <NavLinks onNavigate={closeMobileMenu} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-zinc-50">{children}</div>
    </div>
  );
}
