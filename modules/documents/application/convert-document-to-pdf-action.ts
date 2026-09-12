"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { convertGeneratedDocumentToPdf } from "@/modules/documents/application/convert-document-to-pdf";

export type ConvertDocumentToPdfActionState = {
  ok: boolean;
  message: string | null;
  pdfFileKey?: string;
  pdfFileName?: string;
};

export async function convertDocumentToPdfAction(
  _previous: ConvertDocumentToPdfActionState,
  formData: FormData,
): Promise<ConvertDocumentToPdfActionState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: "You must be signed in." };
  }

  const generatedDocumentId = formData.get("generatedDocumentId");
  const lpoId = formData.get("lpoId");
  if (typeof generatedDocumentId !== "string" || !generatedDocumentId) {
    return { ok: false, message: "Missing document." };
  }

  try {
    const updated = await convertGeneratedDocumentToPdf(generatedDocumentId);

    if (typeof lpoId === "string" && lpoId) {
      revalidatePath(`/lpo/${lpoId}`);
    }

    return {
      ok: true,
      message: "Converted to PDF.",
      pdfFileKey: updated.pdfFileKey ?? undefined,
      pdfFileName: updated.pdfFileName ?? undefined,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not convert to PDF.";
    return { ok: false, message };
  }
}
