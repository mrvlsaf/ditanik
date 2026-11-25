"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { withRequestNonce } from "@/lib/with-request-nonce";

/**
 * A link (styled as a button or plain text) that opens a tab on a page, for
 * example `/fabric?tab=issue`. The nonce makes every click a new address, so
 * the page opens the tab even when the same link was clicked before or the
 * tab was changed by hand in between.
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
