"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateIndependentDocument } from "@/modules/documents/application/generate-independent-document";

export type GenerateIndependentDocumentActionState = {
  ok: boolean;
  message: string | null;
  documentNumber?: string;
  fileKey?: string;
  fileName?: string;
};

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function generateIndependentDocumentAction(
  _previous: GenerateIndependentDocumentActionState,
  formData: FormData,
): Promise<GenerateIndependentDocumentActionState> {
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

  let lineItems: unknown;
  try {
    lineItems = JSON.parse(String(formData.get("lineItemsJson") ?? "[]"));
  } catch {
    return { ok: false, message: "Line items could not be read — reload and retry." };
  }

  try {
    const generated = await generateIndependentDocument({
      generatedByUserId: dbUser.id,
      values: {
        type: text(formData, "type"),
        siteCode: text(formData, "siteCode"),
        clientName: text(formData, "clientName"),
        clientSubEntityName: text(formData, "clientSubEntityName"),
        clientTrn: text(formData, "clientTrn"),
        address: text(formData, "address"),
        lpoReference: text(formData, "lpoReference"),
        noteType: text(formData, "noteType"),
        dispatchDate: text(formData, "dispatchDate"),
        notes: text(formData, "notes"),
        lineItems,
      },
    });

    revalidatePath("/documents");
    return {
      ok: true,
      message: `${generated.documentNumber} generated.`,
      documentNumber: generated.documentNumber,
      fileKey: generated.fileKey,
      fileName: generated.fileName,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not generate document.";
    return { ok: false, message };
  }
}
