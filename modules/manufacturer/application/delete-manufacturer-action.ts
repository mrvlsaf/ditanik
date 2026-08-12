"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteManufacturer } from "@/modules/manufacturer/application/manufacturers";

export async function deleteManufacturerAction(
  manufacturerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteManufacturer({
      manufacturerId,
      actorUserId: session.user.id,
    });
    revalidatePath("/manufacturers");
    revalidatePath("/fabric");
    revalidatePath("/lpo");
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete manufacturer.";
    return { ok: false, message };
  }
}
