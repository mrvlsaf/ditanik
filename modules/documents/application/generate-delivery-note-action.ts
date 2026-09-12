"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateDeliveryNoteDocument } from "@/modules/documents/application/generate-delivery-note";

export type GenerateDeliveryNoteActionState = {
  ok: boolean;
  message: string | null;
  documentNumber?: string;
  fileKey?: string;
  fileName?: string;
};

export async function generateDeliveryNoteAction(
  _previous: GenerateDeliveryNoteActionState,
  formData: FormData,
): Promise<GenerateDeliveryNoteActionState> {
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

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw : null;

  try {
    const generated = await generateDeliveryNoteDocument({
      lpoId,
      generatedByUserId: dbUser.id,
      notes,
    });

    revalidatePath(`/lpo/${lpoId}`);
    return {
      ok: true,
      message: `Delivery note ${generated.documentNumber} generated.`,
      documentNumber: generated.documentNumber,
      fileKey: generated.fileKey,
      fileName: generated.fileName,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not generate delivery note.";
    return { ok: false, message };
  }
}
