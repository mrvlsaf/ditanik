"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { withRequestNonce } from "@/lib/with-request-nonce";

/**
 * A button-styled link that opens a tab on this LPO's page. The nonce makes
 * every click a new address, so the page re-opens the tab even when the same
 * link was clicked before (or the tab was changed by hand in between).
 */
export function OpenTabLink({
  lpoId,
  tab,
  className,
  children,
}: Readonly<{
  lpoId: string;
  tab: string;
  className?: string;
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const href = `/lpo/${lpoId}?tab=${tab}`;

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        router.push(withRequestNonce(href), { scroll: true });
      }}
    >
      {children}
    </Link>
  );
}
