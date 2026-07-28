"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  attachReviewPdf,
  markLpoAsDelivered,
  markLpoAsReviewed,
} from "@/modules/lpo/application/lpo-transitions";

export type LpoActionState = {
  ok: boolean;
  message: string | null;
};

function revalidateLpo(lpoId: string) {
  revalidatePath(`/lpo/${lpoId}`);
  revalidatePath("/lpo");
}

export async function attachReviewPdfAction(
  lpoId: string,
  _previous: LpoActionState,
  formData: FormData,
): Promise<LpoActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { ok: false, message: "Review PDF is required." };
  }

  try {
    await attachReviewPdf({
      lpoId,
      file: fileValue,
      actorUserId: session.user.id,
    });
    revalidateLpo(lpoId);
    return { ok: true, message: "Review PDF uploaded." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not upload review PDF.";
    return { ok: false, message };
  }
}

export async function markLpoAsReviewedAction(
  lpoId: string,
): Promise<LpoActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await markLpoAsReviewed({
      lpoId,
      actorUserId: session.user.id,
    });
    revalidateLpo(lpoId);
    return { ok: true, message: "LPO marked as Reviewed." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not mark as Reviewed.";
    return { ok: false, message };
  }
}

export async function markLpoAsDeliveredAction(
  lpoId: string,
): Promise<LpoActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await markLpoAsDelivered({
      lpoId,
      actorUserId: session.user.id,
    });
    revalidateLpo(lpoId);
    return { ok: true, message: "LPO marked as Delivered." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not mark as Delivered.";
    return { ok: false, message };
  }
}
