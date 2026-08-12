"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteLpo } from "@/modules/lpo/application/delete-lpo";

export async function deleteLpoAction(
  lpoId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteLpo({ lpoId, actorUserId: session.user.id });
    revalidatePath("/lpo");
    revalidatePath("/fabric");
    revalidatePath("/notifications");
    revalidatePath("/manufacturers");
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not delete LPO.";
    return { ok: false, message };
  }
}
