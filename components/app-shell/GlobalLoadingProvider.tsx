"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { downloadFile } from "@/lib/files/download-file";

/** Give up waiting for a link to land (a redirect back to the same page, say). */
const LINK_TIMEOUT_MS = 15_000;

type GlobalLoadingControls = {
  show: () => void;
  hide: () => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingControls | null>(null);

/**
 * App-wide loading overlay, mounted once in the root layout. While any async
 * action is pending it shows a full-page spinner that blocks clicks.
 * Components call `useGlobalPending(isPending)`; the provider does the counting.
 * Plain links and file downloads are covered here too (see `GlobalLinkLoading`),
 * so they need no wiring of their own.
 * `useConfirmDelete` is not wired in: its ConfirmDialog has its own backdrop
 * and "Working…" state.
 */
export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  // A count, not a boolean: the overlay stays up until every pending flag clears.
  const [count, setCount] = useState(0);

  const show = useCallback(() => setCount((c) => c + 1), []);
  const hide = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <GlobalLoadingContext.Provider value={{ show, hide }}>
      {children}
      <Suspense fallback={null}>
        <GlobalLinkLoading show={show} hide={hide} />
      </Suspense>
      {count > 0 ? <GlobalLoadingOverlay /> : null}
    </GlobalLoadingContext.Provider>
  );
}

/**
 * Watches every link click in the app. A link to another page shows the overlay until
 * that page has loaded (the address changes). A file download link is fetched here so
 * the overlay stays up until the file is ready. Links that handle their own loading
 * (filters, tabs) carry `data-no-global-loader`.
 */
function GlobalLinkLoading({ show, hide }: Readonly<GlobalLoadingControls>) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      pendingRef.current = false;
      hide();
    }
  }, [hide]);

  // The new page is ready once the address has changed.
  useEffect(() => {
    finish();
  }, [pathname, search, finish]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }
      const anchor = event.target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute("data-no-global-loader") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      const isFileDownload =
        url.pathname === "/api/files" && url.searchParams.get("download") === "1";
      if (isFileDownload) {
        event.preventDefault();
        show();
        downloadFile(url.toString())
          .then((saved) => {
            if (!saved) {
              window.location.assign(url.toString());
            }
          })
          .catch(() => window.location.assign(url.toString()))
          .finally(hide);
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        return;
      }
      const sameAddress =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (sameAddress || pendingRef.current) {
        return;
      }
      pendingRef.current = true;
      show();
      timerRef.current = window.setTimeout(finish, LINK_TIMEOUT_MS);
    }

    // Capture phase, so it runs before a link's own handler can stop the event.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [show, hide, finish]);

  return null;
}

function GlobalLoadingOverlay() {
  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="assertive"
      // fixed + inset-0 + last painted already blocks pointer events.
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
        aria-hidden
      />
      <span className="sr-only">Working…</span>
    </div>
  );
}

function useGlobalLoadingControls(): GlobalLoadingControls {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    throw new Error(
      "useGlobalPending must be used within GlobalLoadingProvider (mounted in app/layout.tsx).",
    );
  }
  return ctx;
}

/** Wires an existing pending flag (useTransition, useActionState, useState) to the overlay. */
export function useGlobalPending(isPending: boolean) {
  const { show, hide } = useGlobalLoadingControls();
  const shownRef = useRef(false);

  useEffect(() => {
    if (isPending && !shownRef.current) {
      shownRef.current = true;
      show();
    } else if (!isPending && shownRef.current) {
      shownRef.current = false;
      hide();
    }
  }, [isPending, show, hide]);

  // Release this component's count if it unmounts while pending.
  useEffect(() => {
    return () => {
      if (shownRef.current) {
        shownRef.current = false;
        hide();
      }
    };
    // Runs only on unmount; must use the latest hide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
