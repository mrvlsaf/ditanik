"use client";

import { useRegisterPageHeader } from "@/components/app-shell/page-header-context";

export function PageContainer({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children?: React.ReactNode;
}>) {
  const hasAppHeader = useRegisterPageHeader(title, description);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {!hasAppHeader ? (
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-zinc-600 sm:text-base">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </main>
  );
}
