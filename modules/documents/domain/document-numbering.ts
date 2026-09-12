import { DocumentType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";

/**
 * Type code embedded in generated document numbers. QUO for Quote is a
 * placeholder pending the real Excel workbooks — confirm against those
 * before Phase 4 builds the Quote template.
 */
export const DOCUMENT_TYPE_CODE: Record<DocumentType, string> = {
  [DocumentType.QUOTATION]: "QTN",
  [DocumentType.QUOTE]: "QUO",
  [DocumentType.TAX_INVOICE]: "INV",
  [DocumentType.DELIVERY_NOTE]: "DN",
};

/** Dubai calendar day (yyyy-MM-dd) truncated to UTC midnight — the DocumentSequence key. */
export function dubaiCalendarDayKey(date: Date): Date {
  const label = formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
  return new Date(`${label}T00:00:00.000Z`);
}

/** Full 8-digit DDMMYYYY in Asia/Dubai — the app always emits all 8 digits. */
export function formatDdMmYyyy(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "ddMMyyyy");
}

export type DocumentNumberInput = {
  siteCode: string;
  type: DocumentType;
  generatedAt: Date;
  /** The Nth document of this type generated globally today (from DocumentSequence). */
  sequence: number;
};

/** `{SiteCode}-{TYPE}-{DDMMYYYY}-{SequenceOfDay}`, e.g. AHO-INV-23072026-09. */
export function formatDocumentNumber(input: DocumentNumberInput): string {
  const siteCode = input.siteCode.trim();
  if (!siteCode) {
    throw new Error("Site code is required to number a document.");
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 1) {
    throw new Error("Sequence must be a positive integer.");
  }

  const typeCode = DOCUMENT_TYPE_CODE[input.type];
  const datePart = formatDdMmYyyy(input.generatedAt);
  const sequencePart = String(input.sequence).padStart(2, "0");

  return `${siteCode.toUpperCase()}-${typeCode}-${datePart}-${sequencePart}`;
}
