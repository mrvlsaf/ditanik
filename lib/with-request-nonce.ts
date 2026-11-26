/**
 * Appends a per-click nonce (`r`) to a notification deep link so clicking the same
 * link twice gives a distinct URL; otherwise the Next.js router treats it as a
 * no-op and LpoDeepLinkFocus's scroll/highlight effect does not re-run.
 */
export function withRequestNonce(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}r=${Date.now()}`;
}
