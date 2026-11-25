import type { PdfLine } from "@/modules/lpo/infrastructure/pdf-text-extraction";

/**
 * Rule-based prefill parser for the client LPO PDF format (Ishraq Hospitality's
 * procurement system). Not a general PDF reader: it matches fixed labels and
 * reads the item table's columns from each document's own content.
 * Every field is best-effort and independent; nothing is written to the
 * database. The result always lands in the reviewable Create LPO form.
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
  return line.tokens
    .map((t) => t.text)
    .join(" ")
    .trim();
}

function isPlaceholder(value: string): boolean {
  return /^[-\s]*$/.test(value);
}

/**
 * Finds `label` as a case-insensitive prefix of a token and returns the rest of
 * that token, the remaining tokens on the line, and — when the nearest line
 * below starts at about the value's x position (a wrapped value) — that line too.
 * The nearest-below search is needed because label/value pairs sit in a right
 * column that does not line up line-for-line with the left one.
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
  aed: "AED",
  "us dollar": "USD",
  "us dollars": "USD",
  usd: "USD",
};

function normalizeCurrency(raw: string | null): string | null {
  if (!raw) return null;
  return CURRENCY_NAME_MAP[raw.trim().toLowerCase()] ?? raw.trim();
}

type AddressColumn = { headerX: number; lines: PdfLine[] };

/**
 * Splits the side-by-side "Invoice address" / "Delivery address" blocks into
 * left and right columns by x-position (a top-to-bottom read would interleave them).
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
  const endIndex =
    tableHeaderIndex === -1 ? Math.min(lines.length, headerIndex + 12) : tableHeaderIndex;

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

const COMPANY_NAME_PATTERN =
  /^[A-Z0-9&.,'\s-]+(LLC|L\.L\.C\.?|CO\.?|COMPANY|EST\.?|LTD\.?)$/;

function parseInvoiceColumn(column: AddressColumn): {
  clientName: string | null;
  clientSubEntityName: string | null;
  clientTrn: string | null;
  invoiceAddress: string | null;
} {
  const texts = column.lines.map(lineText).filter(Boolean);
  if (texts.length === 0) {
    return {
      clientName: null,
      clientSubEntityName: null,
      clientTrn: null,
      invoiceAddress: null,
    };
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
  const clientSubEntityName =
    subEntityIndex === -1 ? null : (rest[subEntityIndex] ?? null);

  const addressLines = rest.filter((_, i) => i !== trnIndex && i !== subEntityIndex);
  const invoiceAddress = addressLines.length > 0 ? addressLines.join("\n") : null;

  return { clientName, clientSubEntityName, clientTrn, invoiceAddress };
}

function parseDeliveryColumn(
  column: AddressColumn,
  clientName: string | null,
): string | null {
  const texts = column.lines.map(lineText).filter(Boolean);
  if (texts.length === 0) return null;
  // Drop the leading entity-name line when it repeats the invoice block's.
  const addressLines = clientName && texts[0] === clientName ? texts.slice(1) : texts;
  return addressLines.length > 0 ? addressLines.join("\n") : null;
}

// Item table column detection reads each row's own content, because the number
// of columns varies between LPOs from the same system (fixed pixel bands dropped items):
//   - a new item starts at a line whose leftmost token is a bare position number;
//   - the description's left edge is the token after the first item's position number;
//   - the article number looks like "(NN-NNNNNN)" or "NN-NNNNNN" and its x-position
//     is the description's right edge;
//   - quantity has exactly 3 decimals; price and running total have 2, and price is
//     the number just left of the quantity.
const POSITION_PATTERN = /^\d{1,3}$/;
const ARTICLE_NO_PATTERN = /^\(?\d{1,4}-\d{3,}\)?$/;
const QUANTITY_PATTERN = /^\d[\d,']*\.\d{3}$/;
const PRICE_LIKE_PATTERN = /^\d[\d,']*\.\d{2}$/;

function firstNumber(text: string): number | null {
  const match = /-?\d+(\.\d+)?/.exec(text.replace(/[,']/g, ""));
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

  // A new item starts at a line whose leftmost token is a bare position number.
  const startIndices: number[] = [];
  tableLines.forEach((line, i) => {
    const first = line.tokens[0];
    if (first && POSITION_PATTERN.test(first.text.trim())) {
      startIndices.push(i);
    }
  });

  // The description column's left edge comes from the first item's row.
  const [firstStartIndex] = startIndices;
  const referenceRow =
    firstStartIndex !== undefined ? tableLines[firstStartIndex] : undefined;
  const descriptionStartX = referenceRow?.tokens[1]?.x ?? 96;
  const descriptionMinX = descriptionStartX - 2;

  const items: ExtractedLpoLineItem[] = [];
  startIndices.forEach((startIndex, i) => {
    const endOfGroup = startIndices[i + 1] ?? tableLines.length;
    const group = tableLines.slice(startIndex, endOfGroup);
    const firstLine = group[0];
    if (!firstLine) return;

    const articleToken = group
      .flatMap((line) => line.tokens)
      .find((t) => ARTICLE_NO_PATTERN.test(t.text.trim()));
    const articleNo = articleToken
      ? articleToken.text.trim().replace(/^\(|\)$/g, "")
      : null;
    const descriptionMaxX = articleToken?.x ?? Infinity;

    const descriptionParts = group.flatMap((line) =>
      line.tokens
        .filter((t) => t.x >= descriptionMinX && t.x < descriptionMaxX)
        .map((t) => t.text),
    );
    const description = descriptionParts.join(" ").replace(/\s+/g, " ").trim();

    // Quantity has exactly 3 decimals; price and running total have 2.
    const quantityToken = firstLine.tokens.find((t) =>
      QUANTITY_PATTERN.test(t.text.trim()),
    );
    const quantityRaw = quantityToken ? firstNumber(quantityToken.text) : null;
    const quantity = quantityRaw != null ? Math.round(quantityRaw) : null;

    const priceCandidates = firstLine.tokens.filter((t) =>
      PRICE_LIKE_PATTERN.test(t.text.trim()),
    );
    const priceToken = quantityToken
      ? [...priceCandidates].reverse().find((t) => t.x < quantityToken.x)
      : priceCandidates[0];
    const unitPrice = priceToken ? firstNumber(priceToken.text) : null;

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
  const paymentTerms =
    paymentTermsRaw && !isPlaceholder(paymentTermsRaw) ? paymentTermsRaw : null;
  const deliveryTerms =
    deliveryTermsRaw && !isPlaceholder(deliveryTermsRaw) ? deliveryTermsRaw : null;

  const columns = extractAddressColumns(lines);
  const invoiceParsed = columns
    ? parseInvoiceColumn(columns.invoice)
    : {
        clientName: null,
        clientSubEntityName: null,
        clientTrn: null,
        invoiceAddress: null,
      };
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
/**
 * How many of `data`'s fields the parser filled in; decides whether a PDF was
 * recognizable (see handlePrefillFromPdf in CreateLpoForm.tsx, which runs client-side).
 */
export function countFilledFields(data: ExtractedLpoData): number {
  const headerFields = [
    data.orderNumber,
    data.orderDate,
    data.deliveryDate,
    data.currency,
    data.clientName,
    data.clientSubEntityName,
    data.clientTrn,
    data.invoiceAddress,
    data.deliveryAddress,
    data.paymentTerms,
    data.deliveryTerms,
  ];
  const filledHeaders = headerFields.filter(
    (value) => value != null && value !== "",
  ).length;
  return filledHeaders + data.lineItems.length;
}
