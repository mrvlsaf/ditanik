"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createLpo } from "@/modules/lpo/application/create-lpo";

export type CreateLpoActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createLpoAction(
  _previous: CreateLpoActionState,
  formData: FormData,
): Promise<CreateLpoActionState> {
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

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { ok: false, message: "LPO document PDF is required." };
  }

  try {
    await createLpo({
      lpoNumber: readFormString(formData, "lpoNumber"),
      nickname: readFormString(formData, "nickname"),
      clientName: readFormString(formData, "clientName"),
      receivedDate: readFormString(formData, "receivedDate"),
      file: fileValue,
      createdByUserId: dbUser.id,
    });

    revalidatePath("/lpo");
    return { ok: true, message: "LPO created." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not create LPO.";
    return { ok: false, message };
  }
}
