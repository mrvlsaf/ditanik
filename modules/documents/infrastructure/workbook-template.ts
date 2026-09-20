import path from "node:path";

import ExcelJS from "exceljs";

/**
 * Loads one of the Deezano Excel templates checked into
 * templates/documents/ (extracted from the client's own workbooks).
 * `templates/` is included in the Vercel serverless bundle via
 * `outputFileTracingIncludes` in next.config.ts.
 *
 * Returns both the workbook (needed to serialize the result) and its one
 * worksheet, already resolved and non-null — every template is a single
 * extracted sheet, so callers never have to guard against a missing sheet.
 */
export async function loadTemplateWorkbook(
  fileName: string,
): Promise<{ workbook: ExcelJS.Workbook; sheet: ExcelJS.Worksheet }> {
  const templatePath = path.join(
    process.cwd(),
    "templates",
    "documents",
    fileName,
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`Template "${fileName}" has no worksheet.`);
  }
  return { workbook, sheet };
}

function parseRange(range: string) {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
  if (!match) return null;
  const [, c1, r1, c2, r2] = match;
  return { c1, r1: Number(r1), c2, r2: Number(r2) };
}

/**
 * Inserts `count` extra copies of `templateRow` immediately after it (cloning
 * its style — the standard way to grow a line-item table from a template's
 * single sample row), shifting every row below it down by `count`.
 *
 * ExcelJS's own `duplicateRow` shifts cell values/styles correctly but does
 * NOT shift merged-cell ranges below the insertion point (verified against
 * the real templates) — so merges at/after the insertion point are manually
 * unmerged, the rows duplicated, then re-merged at their new coordinates.
 * A no-op when `count` is 0 or negative (e.g. exactly one line item).
 */
export function insertTemplateRows(
  worksheet: ExcelJS.Worksheet,
  templateRow: number,
  count: number,
): void {
  if (count <= 0) return;
  const insertAt = templateRow + 1;

  const toShift = worksheet.model.merges
    .map(parseRange)
    .filter((r): r is NonNullable<typeof r> => r !== null && r.r1 >= insertAt);

  for (const r of toShift) {
    worksheet.unMergeCells(`${r.c1}${r.r1}:${r.c2}${r.r2}`);
  }

  worksheet.duplicateRow(templateRow, count, true);

  for (const r of toShift) {
    worksheet.mergeCells(
      `${r.c1}${r.r1 + count}:${r.c2}${r.r2 + count}`,
    );
  }
}

/**
 * The inverse of `insertTemplateRows`: removes `count` rows starting at
 * `firstRow` (used to trim a template's extra sample line-item rows down to
 * the actual number of items on a document), shifting every row below the
 * removed block up by `count` — including merges, which `spliceRows` alone
 * does not shift.
 *
 * Like `duplicateRow`, `spliceRows` doesn't touch the merge registry either:
 * left alone, merges that sat inside the removed block become stale ghosts
 * pointing at whatever row now occupies their old position (the physically
 * shifted-up content), which then collides with the real merge that belongs
 * there. So every merge at or after `firstRow` — inside the removed block or
 * below it — is unmerged first; only the ones that were below the block are
 * re-merged afterwards, shifted up by `count`.
 */
export function removeTemplateRows(
  worksheet: ExcelJS.Worksheet,
  firstRow: number,
  count: number,
): void {
  if (count <= 0) return;
  const afterRemoved = firstRow + count;

  const toUnmerge = worksheet.model.merges
    .map(parseRange)
    .filter((r): r is NonNullable<typeof r> => r !== null && r.r1 >= firstRow);

  for (const r of toUnmerge) {
    worksheet.unMergeCells(`${r.c1}${r.r1}:${r.c2}${r.r2}`);
  }

  worksheet.spliceRows(firstRow, count);

  for (const r of toUnmerge) {
    if (r.r1 < afterRemoved) continue; // was inside the removed block — gone for good.
    worksheet.mergeCells(
      `${r.c1}${r.r1 - count}:${r.c2}${r.r2 - count}`,
    );
  }
}

/**
 * Grows or shrinks a template's line-item table (which ships with
 * `templateRowCount` real sample rows starting at `firstItemRow`) to exactly
 * `desiredCount` rows, cloning the last sample row's style for extra rows or
 * trimming from the end — either way, shifting everything below the table
 * (totals, footer, and their merges) to match.
 */
export function setLineItemRowCount(
  worksheet: ExcelJS.Worksheet,
  firstItemRow: number,
  templateRowCount: number,
  desiredCount: number,
): void {
  const target = Math.max(desiredCount, 1);
  const delta = target - templateRowCount;
  if (delta > 0) {
    insertTemplateRows(worksheet, firstItemRow + templateRowCount - 1, delta);
  } else if (delta < 0) {
    removeTemplateRows(worksheet, firstItemRow + target, -delta);
  }
}
