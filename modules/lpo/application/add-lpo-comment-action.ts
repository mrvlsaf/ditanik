"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { addLpoComment } from "@/modules/lpo/application/add-lpo-comment";

export type AddLpoCommentActionState = {
  ok: boolean;
  message: string | null;
};

export async function addLpoCommentAction(
  lpoId: string,
  _previous: AddLpoCommentActionState,
  formData: FormData,
): Promise<AddLpoCommentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const bodyValue = formData.get("body");
  const body = typeof bodyValue === "string" ? bodyValue : "";

  try {
    await addLpoComment({
      lpoId,
      body,
      createdByUserId: session.user.id,
    });

    revalidatePath(`/lpo/${lpoId}`);
    revalidatePath("/lpo");
    return { ok: true, message: "Comment added." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not add comment.";
    return { ok: false, message };
  }
}
