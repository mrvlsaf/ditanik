"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateQuotationDocument } from "@/modules/documents/application/generate-quotation";

export type GenerateQuotationActionState = {
  ok: boolean;
  message: string | null;
  documentNumber?: string;
  fileKey?: string;
  fileName?: string;
};

export async function generateQuotationAction(
  _previous: GenerateQuotationActionState,
  formData: FormData,
): Promise<GenerateQuotationActionState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: "You must be signed in." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) {
    return {
      ok: false,
      message: "User record not found. Sign out and sign in again.",
    };
  }

  const lpoId = formData.get("lpoId");
  if (typeof lpoId !== "string" || !lpoId) {
    return { ok: false, message: "Missing LPO." };
  }

  try {
    const generated = await generateQuotationDocument({
      lpoId,
      generatedByUserId: dbUser.id,
    });

    revalidatePath(`/lpo/${lpoId}`);
    return {
      ok: true,
      message: `Quotation ${generated.documentNumber} generated.`,
      documentNumber: generated.documentNumber,
      fileKey: generated.fileKey,
      fileName: generated.fileName,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not generate quotation.";
    return { ok: false, message };
  }
}
