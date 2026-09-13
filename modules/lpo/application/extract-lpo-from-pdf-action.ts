"use server";

import { auth } from "@/auth";
import { extractLpoFromPdf } from "@/modules/lpo/application/extract-lpo-from-pdf";
import type { ExtractedLpoData } from "@/modules/lpo/domain/lpo-extraction";
import { assertPdfFile } from "@/modules/files/domain/pdf-rules";

export type ExtractLpoFromPdfActionState = {
  ok: boolean;
  message: string | null;
  data: ExtractedLpoData | null;
};

function countFilledFields(data: ExtractedLpoData): number {
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
  const filledHeaders = headerFields.filter((value) => value != null && value !== "").length;
  return filledHeaders + data.lineItems.length;
}

/**
 * Prefill step in front of the Create LPO form (docs/DOCUMENT-GENERATION-PLAN.md
 * §2/§7 Phase 6) — never saves or generates anything. The person filling out
 * the form still sees and can correct every field before it goes anywhere;
 * this only saves them re-typing what the parser could confidently read off
 * the PDF. A PDF the parser can't make sense of (a scan, an unrelated file,
 * a differently-formatted client) fails back to an empty/manual form rather
 * than blocking LPO creation.
 */
export async function extractLpoFromPdfAction(
  _previous: ExtractLpoFromPdfActionState,
  formData: FormData,
): Promise<ExtractLpoFromPdfActionState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: "You must be signed in.", data: null };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose the LPO PDF above first.", data: null };
  }

  try {
    assertPdfFile(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Only PDF files are allowed.";
    return { ok: false, message, data: null };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const data = await extractLpoFromPdf(bytes);
    const filledCount = countFilledFields(data);

    if (filledCount === 0) {
      return {
        ok: false,
        message:
          "Couldn't find fields this parser recognizes in that PDF — no problem, just fill in the form by hand.",
        data: null,
      };
    }

    return {
      ok: true,
      message: `Prefilled ${filledCount} field${filledCount === 1 ? "" : "s"} from the PDF — check every one before saving, especially the line items.`,
      data,
    };
  } catch {
    return {
      ok: false,
      message: "Couldn't read that PDF — fill in the form manually.",
      data: null,
    };
  }
}
