/**
 * Urgent LPOs are rushed through: no planned dates, no reminders, and the
 * customer's PDF is optional. Their number is generated (URGENT_1, URGENT_2,
 * ...) instead of typed, and counts up on its own.
 */
export const URGENT_LPO_PREFIX = "URGENT_";

/** The number given to the nth urgent LPO. */
export function formatUrgentLpoNumber(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("Urgent LPO counter must be a whole number from 1.");
  }
  return `${URGENT_LPO_PREFIX}${n}`;
}

/** True for a number that looks like a generated urgent one, e.g. "URGENT_12". */
export function looksLikeUrgentLpoNumber(value: string): boolean {
  return /^URGENT_\d+$/i.test(value.trim());
}
