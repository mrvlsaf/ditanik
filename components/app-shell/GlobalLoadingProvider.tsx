"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type GlobalLoadingControls = {
  show: () => void;
  hide: () => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingControls | null>(null);

/**
 * App-wide loading overlay, mounted once in the root layout. While any async
 * action is pending it shows a full-page spinner that blocks clicks.
 * Components call `useGlobalPending(isPending)`; the provider does the counting.
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
      {count > 0 ? <GlobalLoadingOverlay /> : null}
    </GlobalLoadingContext.Provider>
  );
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
