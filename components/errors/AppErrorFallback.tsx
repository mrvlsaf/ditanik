"use client";

import { isDatabaseUnavailableError } from "@/lib/db-errors";

export function AppErrorFallback({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const databaseUnavailable = isDatabaseUnavailableError(error);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
        {databaseUnavailable ? "Database is waking up" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        {databaseUnavailable
          ? "The database was idle and is starting again. Wait a few seconds, then try again."
          : "An unexpected error occurred. You can try again, or reload the page."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Reload page
        </button>
      </div>
    </main>
  );
}
