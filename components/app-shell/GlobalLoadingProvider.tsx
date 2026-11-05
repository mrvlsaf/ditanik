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
 * App-wide "something is loading" overlay. Mounted once in the root layout,
 * it renders a full-page spinner that blocks every other click while any
 * async button action (a form submit, a "Prefill from this PDF"-style
 * button, ...) is in flight, so a person can't fire a second action on top
 * of one that's still running.
 *
 * Nothing calls `show`/`hide` directly — call `useGlobalPending(isPending)`
 * from wherever a component already tracks its own pending flag
 * (useTransition, useActionState, or a plain useState loading flag all
 * expose one), and this provider does the counting and rendering.
 *
 * A confirm-delete flow (`useConfirmDelete`) is deliberately NOT wired into
 * this: its `ConfirmDialog` already renders its own full-viewport backdrop
 * that blocks the rest of the page and shows its own "Working…" state while
 * pending, so layering this overlay on top of it would just hide that
 * dialog behind a second, redundant spinner.
 */
export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  // A count, not a boolean: more than one pending flag can be true at the
  // same time (e.g. a form's own isPending plus another component further
  // up the tree), and the overlay must stay up until all of them clear,
  // not just whichever one changes last.
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
      // fixed + inset-0 + this being the last element painted already
      // intercepts every pointer event aimed at whatever is behind it; no
      // click handler is needed to "block" clicks.
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

/**
 * Wires an existing pending/loading flag up to the app-wide full-page
 * spinner. Drop this one line into any component that already has an
 * `isPending`-shaped flag — no need to change how that flag is produced, or
 * how the button itself renders its own "Saving…" label/disabled state:
 * both should stay exactly as they are for the per-button feedback, this
 * just adds the page-wide block on top.
 */
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

  // If the component unmounts while still pending (e.g. navigation away
  // mid-submit), release its count instead of leaving the overlay stuck on
  // forever.
  useEffect(() => {
    return () => {
      if (shownRef.current) {
        shownRef.current = false;
        hide();
      }
    };
    // Intentionally runs only on mount/unmount: this cleanup must always
    // reference the latest hide, but must not re-run on every isPending
    // change like the effect above does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
