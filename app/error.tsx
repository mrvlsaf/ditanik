"use client";

import { AppErrorFallback } from "@/components/errors/AppErrorFallback";

export default function RootError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return <AppErrorFallback error={error} reset={reset} />;
}
