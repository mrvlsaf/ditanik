"use client";

import { useEffect, useRef } from "react";

/**
 * One collapsible Help topic. A link like /help#fabric-flow opens the topic it
 * points to (a closed <details> would otherwise hide the target).
 */
export function HelpTopic({
  id,
  title,
  defaultOpen,
  children,
}: Readonly<{
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}>) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function openIfTargeted() {
      if (window.location.hash === `#${id}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: "start" });
      }
    }
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  return (
    <details
      ref={ref}
      id={id}
      open={defaultOpen}
      className="group scroll-mt-24 border-b border-[var(--border)] last:border-b-0"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-base font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 fill-none stroke-current stroke-2 transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="flex flex-col gap-4 px-5 pt-1 pb-5">{children}</div>
    </details>
  );
}
