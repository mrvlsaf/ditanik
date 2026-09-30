/**
 * Appends a per-click nonce to a notification's deep-link path so that
 * clicking the same notification twice in a row (same LPO, same action —
 * e.g. after scrolling away from the highlighted section) always produces
 * a distinct URL.
 *
 * Without this, navigating to a URL identical to the one already loaded is
 * a no-op in the Next.js router: nothing re-renders, so
 * LpoDeepLinkFocus's scroll-into-view + highlight effect never re-runs.
 * The `r` param has no meaning beyond forcing that re-render — it's read
 * back out only to feed LpoDeepLinkFocus's effect dependency array.
 */
export function withRequestNonce(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}r=${Date.now()}`;
}
