"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { withRequestNonce } from "@/lib/with-request-nonce";

/**
 * A link that opens a tab on a page (e.g. `/fabric?tab=issue`). The nonce makes
 * every click a new address, so the tab opens even on a repeat click.
 */
export function TabLink({
  href,
  className,
  children,
}: Readonly<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>) {
  const router = useRouter();

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
