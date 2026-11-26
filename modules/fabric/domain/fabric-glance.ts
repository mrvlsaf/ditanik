import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";

/**
 * Pure helpers for the Fabric page: the three summary numbers and how a
 * movement is labelled. Movement types are plain strings (not the Prisma
 * enum) so tests and client code can import this file freely.
 */

export type MovementTypeName =
  "RECEIVED" | "ISSUED" | "USED_FOR_LPO" | "RETURNED" | "ADJUSTMENT";

/** Summed metres per movement type (receipts +, issues −, returns +). */
export type MovementTotals = Partial<Record<MovementTypeName, number>>;

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Metres sent to manufacturers and not yet returned: issued minus returned.
 * Never below zero (a return recorded without a matching issue should not
 * show negative stock out).
 */
export function issuedOutMeters(totals: MovementTotals): number {
  const issued = -(totals.ISSUED ?? 0);
  const returned = totals.RETURNED ?? 0;
  return Math.max(0, round3(issued - returned));
}

/** "1,240 m", "12.5 m": at most three decimals, no trailing zeros. */
export function formatMeters(value: number): string {
  const text = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(
    round3(value),
  );
  return `${text} m`;
}

/** "+300 m" / "-56 m" for a signed movement quantity. */
export function formatSignedMeters(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMeters(Math.abs(value))}`;
}

/** The first instant of the current month in Dubai (UTC+4, no daylight saving). */
export function startOfBusinessMonth(now: Date): Date {
  const yearMonth = formatInTimeZone(now, BUSINESS_TIMEZONE, "yyyy-MM");
  return new Date(`${yearMonth}-01T00:00:00+04:00`);
}

export type MovementTone = "green" | "blue" | "amber" | "purple" | "gray";

const MOVEMENT_LABELS: Record<MovementTypeName, string> = {
  RECEIVED: "Received",
  ISSUED: "Issued",
  USED_FOR_LPO: "Used for LPO",
  RETURNED: "Returned",
  ADJUSTMENT: "Adjustment",
};

const MOVEMENT_TONES: Record<MovementTypeName, MovementTone> = {
  RECEIVED: "green",
  ISSUED: "blue",
  USED_FOR_LPO: "purple",
  RETURNED: "amber",
  ADJUSTMENT: "gray",
};

export function movementLabel(type: string): string {
  return MOVEMENT_LABELS[type as MovementTypeName] ?? type;
}

export function movementTone(type: string): MovementTone {
  return MOVEMENT_TONES[type as MovementTypeName] ?? "gray";
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
