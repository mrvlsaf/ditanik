import type { PdfLine } from "@/modules/lpo/infrastructure/pdf-text-extraction";

/**
 * Rule-based prefill parser for the client LPO PDF a company like Ishraq
 * Hospitality's procurement system emits — see
 * docs/DOCUMENT-GENERATION-PLAN.md §2. This is deliberately NOT a general
 * PDF-understanding engine: it matches fixed labels ("Order Number", "Order
 * date", "Invoice address", "Delivery address", ...) and a fixed table
 * column layout, calibrated against a real sample LPO
 * (tests/fixtures/JOHNLPO.pdf). Every field is best-effort and independently
 * optional — a miss on one field never blocks or corrupts another, and
 * nothing here writes to the database. The caller always lands the result in
 * the reviewable Create LPO form; the person filling it out is the last line
 * of defense against a parsing mistake, never this module.
 *
 * The line-item table's column x-positions are the part most likely to need
 * retuning against a different client's LPO layout — flagged in the doc
 * comments below the table parser.
 */

export type ExtractedLpoLineItem = {
  description: string;
  articleNo: string | null;
  quantity: number | null;
  unitPrice: number | null;
  discountPercent: number | null;
};

export type ExtractedLpoData = {
  orderNumber: string | null;
  /** ISO calendar date (YYYY-MM-DD), parsed from the source's DD.MM.YYYY format. */
  orderDate: string | null;
  deliveryDate: string | null;
  /** Mapped to a 3-letter code where recognized (e.g. "UAE Dirhams" -> "AED"); otherwise the raw text. */
  currency: string | null;
  clientName: string | null;
  clientSubEntityName: string | null;
  clientTrn: string | null;
  invoiceAddress: string | null;
  deliveryAddress: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  lineItems: ExtractedLpoLineItem[];
};

export type { PdfLine, PdfToken } from "@/modules/lpo/infrastructure/pdf-text-extraction";

function lineText(line: PdfLine): string {
  return line.tokens.map((t) => t.text).join(" ").trim();
}

function isPlaceholder(value: string): boolean {
  return /^[-\s]*$/.test(value);
}

/**
 * Finds `label` as a case-insensitive prefix of some token on some line (the
 * source PDF paints each label as a single text run, sometimes glued
 * directly to its value in the same run) and returns everything after it:
 * whatever's left in that token once the label prefix is stripped, plus any
 * further tokens on the same line — and, when the nearest line below it on
 * the same page starts at roughly the value's own x position (a wrapped
 * value, like the order number's "#034555" continuation) rather than back at
 * the label column, that line's text too. The nearest-below search (rather
 * than just `lines[index + 1]`) matters because this document's label/value
 * pairs sit in a right-hand column that doesn't line up 1:1 with the left
 * column's lines — the very next line in reading order often belongs to the
 * *other* column, not this field's continuation.
 */
function extractLabelValue(lines: PdfLine[], label: string): string | null {
  const needle = label.trim().toLowerCase();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;

    const tokenIndex = line.tokens.findIndex((t) =>
      t.text.trim().toLowerCase().startsWith(needle),
    );
    if (tokenIndex === -1) continue;

    const labelToken = line.tokens[tokenIndex];
    if (!labelToken) continue;
    const gluedRemainder = labelToken.text.trim().slice(label.trim().length).trim();
    const remainingTokens = line.tokens
      .slice(tokenIndex + 1)
      .filter((t) => t.text.trim().length > 0);

    let value = [gluedRemainder, ...remainingTokens.map((t) => t.text)]
      .filter(Boolean)
      .join(" ")
      .trim();

    const valueX = remainingTokens[0]?.x ?? labelToken.x;
    const next = lines.find((candidate, i) => {
      const firstToken = candidate.tokens[0];
      return (
        i > index &&
        candidate.page === line.page &&
        line.y - candidate.y > 0 &&
        line.y - candidate.y <= 20 &&
        firstToken !== undefined &&
        Math.abs(firstToken.x - valueX) < 20
      );
    });
    if (
      value &&
      next &&
      !/^(order|date|currency|invoice|delivery|terms|position)/i.test(lineText(next))
    ) {
      value = `${value} ${lineText(next)}`.trim();
    }

    return value || null;
  }

  return null;
}

/** DD.MM.YYYY[ HH:MM:SS] -> YYYY-MM-DD. Returns null on anything else. */
function parseSourceDate(raw: string | null): string | null {
  if (!raw) return null;
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(raw.trim());
  if (!match) return null;
  const day = match[1];
  const month = match[2];
  const year = match[3];
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const CURRENCY_NAME_MAP: Record<string, string> = {
  "uae dirhams": "AED",
  "aed": "AED",
  "us dollar": "USD",
  "us dollars": "USD",
  "usd": "USD",
};

function normalizeCurrency(raw: string | null): string | null {
  if (!raw) return null;
  return CURRENCY_NAME_MAP[raw.trim().toLowerCase()] ?? raw.trim();
}

type AddressColumn = { headerX: number; lines: PdfLine[] };

/**
 * Locates the side-by-side "Invoice address" / "Delivery address" blocks and
 * splits every line between the header row and the item table into a left
 * column (invoice) and right column (delivery) by x-position — the two
 * blocks are printed as parallel columns, not sequential text, so a plain
 * top-to-bottom read would interleave them.
 */
function extractAddressColumns(
  lines: PdfLine[],
): { invoice: AddressColumn; delivery: AddressColumn } | null {
  const headerIndex = lines.findIndex((line) => {
    const text = lineText(line).toLowerCase();
    return text.includes("invoice address") && text.includes("delivery address");
  });
  if (headerIndex === -1) return null;

  const headerLine = lines[headerIndex];
  if (!headerLine) return null;

  const invoiceToken = headerLine.tokens.find((t) =>
    t.text.toLowerCase().includes("invoice address"),
  );
  const deliveryToken = headerLine.tokens.find((t) =>
    t.text.toLowerCase().includes("delivery address"),
  );
  if (!invoiceToken || !deliveryToken) return null;

  const leftX = invoiceToken.x;
  const rightX = deliveryToken.x;
  const midpoint = (leftX + rightX) / 2;

  const tableHeaderIndex = lines.findIndex(
    (line, i) =>
      i > headerIndex &&
      /position/i.test(lineText(line)) &&
      /item name/i.test(lineText(line)),
  );
  const endIndex = tableHeaderIndex === -1 ? Math.min(lines.length, headerIndex + 12) : tableHeaderIndex;

  const invoiceLines: PdfLine[] = [];
  const deliveryLines: PdfLine[] = [];
  for (let i = headerIndex + 1; i < endIndex; i++) {
    const line = lines[i];
    if (!line || line.page !== headerLine.page) break;
    const leftTokens = line.tokens.filter((t) => t.x < midpoint);
    const rightTokens = line.tokens.filter((t) => t.x >= midpoint);
    if (leftTokens.length > 0) {
      invoiceLines.push({ ...line, tokens: leftTokens });
    }
    if (rightTokens.length > 0) {
      deliveryLines.push({ ...line, tokens: rightTokens });
    }
  }

  return {
    invoice: { headerX: leftX, lines: invoiceLines },
    delivery: { headerX: rightX, lines: deliveryLines },
  };
}

const COMPANY_NAME_PATTERN = /^[A-Z0-9&.,'\s-]+(LLC|L\.L\.C\.?|CO\.?|COMPANY|EST\.?|LTD\.?)$/;

function parseInvoiceColumn(column: AddressColumn): {
  clientName: string | null;
  clientSubEntityName: string | null;
  clientTrn: string | null;
  invoiceAddress: string | null;
} {
  const texts = column.lines.map(lineText).filter(Boolean);
  if (texts.length === 0) {
    return { clientName: null, clientSubEntityName: null, clientTrn: null, invoiceAddress: null };
  }

  const clientName = texts[0] ?? null;
  const rest = texts.slice(1);

  const trnIndex = rest.findIndex((t) => /^TRN[:\s]/i.test(t));
  const trnLine = trnIndex === -1 ? undefined : rest[trnIndex];
  const clientTrn = trnLine ? trnLine.replace(/^TRN[:\s]*/i, "").trim() || null : null;

  const firstRestLine = rest[0];
  const subEntityIndex =
    firstRestLine !== undefined &&
    trnIndex !== 0 &&
    COMPANY_NAME_PATTERN.test(firstRestLine)
      ? 0
      : -1;
  const clientSubEntityName = subEntityIndex === -1 ? null : (rest[subEntityIndex] ?? null);

  const addressLines = rest.filter((_, i) => i !== trnIndex && i !== subEntityIndex);
  const invoiceAddress = addressLines.length > 0 ? addressLines.join("\n") : null;

  return { clientName, clientSubEntityName, clientTrn, invoiceAddress };
}

function parseDeliveryColumn(column: AddressColumn, clientName: string | null): string | null {
  const texts = column.lines.map(lineText).filter(Boolean);
  if (texts.length === 0) return null;
  // Drop the leading entity-name line when it repeats the invoice block's —
  // the address itself starts on the next line either way.
  const addressLines = clientName && texts[0] === clientName ? texts.slice(1) : texts;
  return addressLines.length > 0 ? addressLines.join("\n") : null;
}

// Line-item table column x-bands, calibrated against tests/fixtures/JOHNLPO.pdf
// (an Ishraq Hospitality-issued PO — see docs/DOCUMENT-GENERATION-PLAN.md §2).
// Re-tune these against a couple more real client LPOs before trusting this
// table parser the way the label-based header fields above can be trusted;
// the plan flagged the item table as the harder, more layout-sensitive half.
const TABLE_COLUMNS = {
  position: { min: 55, max: 96 },
  itemName: { min: 96, max: 225 },
  articleNo: { min: 225, max: 292 },
  price: { min: 292, max: 335 },
  quantity: { min: 335, max: 396 },
};

function tokensInBand(line: PdfLine, band: { min: number; max: number }) {
  return line.tokens.filter((t) => t.x >= band.min && t.x < band.max);
}

function firstNumber(text: string): number | null {
  const match = /-?\d+(\.\d+)?/.exec(text.replace(/,/g, ""));
  return match ? Number(match[0]) : null;
}

function extractLineItems(lines: PdfLine[]): ExtractedLpoLineItem[] {
  const tableHeaderIndex = lines.findIndex(
    (line) => /position/i.test(lineText(line)) && /item name/i.test(lineText(line)),
  );
  if (tableHeaderIndex === -1) return [];

  const endIndex = lines.findIndex(
    (line, i) => i > tableHeaderIndex && /total value of order/i.test(lineText(line)),
  );
  const tableLines = lines.slice(
    tableHeaderIndex + 1,
    endIndex === -1 ? lines.length : endIndex,
  );

  // A new item starts at a line carrying a bare integer in the Position band.
  const startIndices: number[] = [];
  tableLines.forEach((line, i) => {
    const positionTokens = tokensInBand(line, TABLE_COLUMNS.position);
    if (positionTokens.some((t) => /^\d+$/.test(t.text.trim()))) {
      startIndices.push(i);
    }
  });

  const items: ExtractedLpoLineItem[] = [];
  startIndices.forEach((startIndex, i) => {
    const endOfGroup = startIndices[i + 1] ?? tableLines.length;
    const group = tableLines.slice(startIndex, endOfGroup);
    const firstLine = group[0];
    if (!firstLine) return;

    const descriptionParts = group.flatMap((line) =>
      tokensInBand(line, TABLE_COLUMNS.itemName).map((t) => t.text),
    );
    const description = descriptionParts.join(" ").replace(/\s+/g, " ").trim();

    const articleToken = group
      .flatMap((line) => tokensInBand(line, TABLE_COLUMNS.articleNo))
      .find((t) => /^\([^)]+\)$/.test(t.text.trim()));
    const articleNo = articleToken ? articleToken.text.trim().replace(/^\(|\)$/g, "") : null;

    const priceToken = tokensInBand(firstLine, TABLE_COLUMNS.price)[0];
    const unitPrice = priceToken ? firstNumber(priceToken.text) : null;

    const quantityToken = tokensInBand(firstLine, TABLE_COLUMNS.quantity)[0];
    const quantityRaw = quantityToken ? firstNumber(quantityToken.text) : null;
    const quantity = quantityRaw != null ? Math.round(quantityRaw) : null;

    const discountText = group.map(lineText).join(" ");
    const discountMatch = /\(([\d.]+)\s*%\)/.exec(discountText);
    const discountPercent = discountMatch ? Number(discountMatch[1]) : null;

    if (description) {
      items.push({ description, articleNo, quantity, unitPrice, discountPercent });
    }
  });

  return items;
}

export function extractLpoData(lines: PdfLine[]): ExtractedLpoData {
  const orderNumber = extractLabelValue(lines, "Order Number");
  const orderDate = parseSourceDate(extractLabelValue(lines, "Order date"));
  const deliveryDate = parseSourceDate(extractLabelValue(lines, "Date of delivery"));
  const currency = normalizeCurrency(extractLabelValue(lines, "Currency"));

  const paymentTermsRaw = extractLabelValue(lines, "Terms of payment");
  const deliveryTermsRaw = extractLabelValue(lines, "Terms of delivery");
  const paymentTerms = paymentTermsRaw && !isPlaceholder(paymentTermsRaw) ? paymentTermsRaw : null;
  const deliveryTerms =
    deliveryTermsRaw && !isPlaceholder(deliveryTermsRaw) ? deliveryTermsRaw : null;

  const columns = extractAddressColumns(lines);
  const invoiceParsed = columns
    ? parseInvoiceColumn(columns.invoice)
    : { clientName: null, clientSubEntityName: null, clientTrn: null, invoiceAddress: null };
  const deliveryAddress = columns
    ? parseDeliveryColumn(columns.delivery, invoiceParsed.clientName)
    : null;

  return {
    orderNumber,
    orderDate,
    deliveryDate,
    currency,
    clientName: invoiceParsed.clientName,
    clientSubEntityName: invoiceParsed.clientSubEntityName,
    clientTrn: invoiceParsed.clientTrn,
    invoiceAddress: invoiceParsed.invoiceAddress,
    deliveryAddress,
    paymentTerms,
    deliveryTerms,
    lineItems: extractLineItems(lines),
  };
}
