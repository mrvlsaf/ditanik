/**
 * Keyboard movement between tabs (WAI-ARIA tabs pattern): arrows wrap around,
 * Home and End jump to the ends. Returns null for any other key.
 */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** The tab to show: the requested one if it exists, otherwise the first. */
export function resolveActiveTab(
  ids: readonly string[],
  requested: string | null | undefined,
): string | null {
  if (ids.length === 0) {
    return null;
  }
  return requested && ids.includes(requested) ? requested : (ids[0] ?? null);
}
