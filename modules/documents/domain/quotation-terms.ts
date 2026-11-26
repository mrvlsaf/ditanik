/**
 * Terms & Conditions printed on a Quotation come from Company Settings
 * (`CompanyProfile.defaultTermsText`, one clause per line); with no text there are none.
 * `**text**` marks bold, and a leading "Label:" is always bolded by the workbook builder.
 * Only the "Payment Terms" clause changes per quotation (see `applyPaymentTerms`).
 */

const TERMS_HEADING = /^terms\s*(and|&)\s*conditions\s*:?$/i;
const OPENING_QUOTE = /^["“”]/;
const CLOSING_QUOTE = /["“”]\s*$/;
// "1 ", "1. ", "12) " in front of a clause: the quotation numbers the clauses itself.
const LEADING_NUMBER = /^\d{1,2}\s*[.)]?\s+(?=\S)/;

/** Joins a quoted clause that was pasted over several lines back into one line. */
function joinQuotedLines(lines: string[]): string[] {
  const joined: string[] = [];
  let open: string | null = null;
  for (const rawLine of lines) {
    if (open !== null) {
      open += ` ${rawLine}`;
      if (CLOSING_QUOTE.test(rawLine)) {
        joined.push(open);
        open = null;
      }
      continue;
    }
    const line = rawLine.replace(LEADING_NUMBER, "");
    if (OPENING_QUOTE.test(line) && !(line.length > 1 && CLOSING_QUOTE.test(line))) {
      open = line;
    } else {
      joined.push(line);
    }
  }
  if (open !== null) joined.push(open);
  return joined;
}

/**
 * CompanyProfile.defaultTermsText holds one clause per line. Text pasted from
 * Excel or a PDF is cleaned up: the "TERMS AND CONDITIONS" heading, clause numbers,
 * wrapping quotes and stray tabs are removed. Returns null when no clause is left.
 */
export function parseTermsText(text: string | null | undefined): string[] | null {
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const clauses = joinQuotedLines(lines)
    .map((line) => line.replace(/^["“”]+|["“”]+$/g, "").trim())
    .filter((line) => line !== "" && !TERMS_HEADING.test(line) && !/^\d+$/.test(line));
  return clauses.length > 0 ? clauses : null;
}

function clauseLabel(clause: string): string {
  const colon = clause.indexOf(":");
  return colon === -1 ? "" : clause.slice(0, colon).trim().toLowerCase();
}

/** Typed payment terms as they are printed: no markup, line breaks or repeated spaces. */
export function normalizePaymentTerms(text: string | null | undefined): string {
  return (text ?? "").replaceAll("**", "").replace(/\s+/g, " ").trim();
}

/**
 * Applies this quotation's payment terms to the clauses. The "Payment Terms" clause
 * is replaced by "Payment Terms: Payment terms are **<typed text>**"; with nothing typed
 * the clause keeps the company wording, with its value in bold. Without terms there is
 * nothing to print, so the typed text is ignored.
 */
export function applyPaymentTerms(
  clauses: readonly string[] | null,
  paymentTerms: string | null | undefined,
): string[] | null {
  if (!clauses || clauses.length === 0) return null;
  const typed = normalizePaymentTerms(paymentTerms);
  const result = [...clauses];
  const index = result.findIndex((clause) => clauseLabel(clause) === "payment terms");

  if (typed !== "") {
    const clause = `Payment Terms: Payment terms are **${typed}**`;
    if (index !== -1) {
      result[index] = clause;
    } else {
      const before = result.findIndex((c) => clauseLabel(c) === "outstanding payments");
      result.splice(before === -1 ? result.length : before, 0, clause);
    }
    return result;
  }

  const existing = index === -1 ? undefined : result[index];
  if (existing && !existing.includes("**")) {
    const match = /^(Payment Terms:\s*(?:Payment terms are\s+)?)(.+)$/i.exec(existing);
    if (match) {
      result[index] = `${match[1]}**${match[2]}**`;
    }
  }
  return result;
}

/** Number of days a Quotation stays valid after its document date. */
export const QUOTATION_VALIDITY_DAYS = 30;

/** Document date + QUOTATION_VALIDITY_DAYS whole days (UTC-safe). */
export function calculateQuotationValidityDate(documentDate: Date): Date {
  const validUntil = new Date(documentDate.getTime());
  validUntil.setUTCDate(validUntil.getUTCDate() + QUOTATION_VALIDITY_DAYS);
  return validUntil;
}
