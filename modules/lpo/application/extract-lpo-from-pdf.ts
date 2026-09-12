import { extractLpoData, type ExtractedLpoData } from "@/modules/lpo/domain/lpo-extraction";
import { extractPdfLines } from "@/modules/lpo/infrastructure/pdf-text-extraction";

export type { ExtractedLpoData } from "@/modules/lpo/domain/lpo-extraction";

/** Reads an uploaded LPO PDF's text layer and runs the rule-based prefill parser over it. */
export async function extractLpoFromPdf(bytes: Buffer): Promise<ExtractedLpoData> {
  const lines = await extractPdfLines(bytes);
  return extractLpoData(lines);
}
