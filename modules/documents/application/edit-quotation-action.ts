"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readOptionalFormString } from "@/lib/form-data";
import { editQuotationDocument } from "@/modules/documents/application/edit-quotation";

export type EditQuotationActionState = {
  ok: boolean;
  message: string | null;
  documentNumber?: string;
  fileKey?: string;
  fileName?: string;
};

export async function editQuotationAction(
  _previous: EditQuotationActionState,
  formData: FormData,
): Promise<EditQuotationActionState> {
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

  const documentId = readOptionalFormString(formData, "documentId");
  if (!documentId) {
    return { ok: false, message: "Missing quotation." };
  }

  let lineItems: unknown;
  try {
    lineItems = JSON.parse(String(formData.get("lineItemsJson") ?? "[]"));
  } catch {
    return { ok: false, message: "Line items could not be read — reload and retry." };
  }

  try {
    const { document, mode } = await editQuotationDocument({
      documentId,
      editedByUserId: dbUser.id,
      values: {
        siteCode: readOptionalFormString(formData, "siteCode"),
        clientName: readOptionalFormString(formData, "clientName"),
        clientSubEntityName: readOptionalFormString(formData, "clientSubEntityName"),
        clientTrn: readOptionalFormString(formData, "clientTrn"),
        address: readOptionalFormString(formData, "address"),
        paymentTerms: readOptionalFormString(formData, "paymentTerms"),
        lineItems,
      },
    });

    revalidatePath("/documents");
    if (document.lpoId) {
      revalidatePath(`/lpo/${document.lpoId}`);
    }
    return {
      ok: true,
      message:
        mode === "updated"
          ? `${document.documentNumber} updated.`
          : `${document.documentNumber} updated and renumbered with today's date.`,
      documentNumber: document.documentNumber,
      fileKey: document.fileKey,
      fileName: document.fileName,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not edit quotation.";
    return { ok: false, message };
  }
}
