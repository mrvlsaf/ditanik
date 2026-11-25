import path from "node:path";

import ExcelJS from "exceljs";

/**
 * Loads a Deezano Excel template from templates/documents/ (bundled via
 * `outputFileTracingIncludes` in next.config.ts). Returns the workbook and its
 * single worksheet, already resolved.
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
 * Inserts `count` copies of `templateRow` right after it (cloning its style) and
 * shifts rows below down. ExcelJS `duplicateRow` does not shift merged ranges, so
 * merges at/after the insertion point are unmerged, then re-merged at new rows.
 * No-op when `count` <= 0.
 */
function insertTemplateRows(
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
 * Inverse of `insertTemplateRows`: removes `count` rows from `firstRow` and
 * shifts rows below up. `spliceRows` does not move merges either, so every merge
 * at/after `firstRow` is unmerged first; only those below the block are re-merged,
 * shifted up by `count`.
 */
function removeTemplateRows(
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
 * Grows or shrinks a template's item table (`templateRowCount` sample rows from
 * `firstItemRow`) to `desiredCount` rows, shifting totals, footer and merges.
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
