"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

/** `router.push` that shows the app-wide loading overlay until the next page is ready. */
export function useNavigateWithLoader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  useGlobalPending(isPending);

  return (href: string, options?: { scroll?: boolean }) => {
    startTransition(() => {
      router.push(href, options);
    });
  };
}
