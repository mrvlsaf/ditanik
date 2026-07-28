"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createLpo } from "@/modules/lpo/application/create-lpo";
import {
  DEFAULT_DELIVERY_DUE_DAYS,
  DEFAULT_REVIEW_DUE_DAYS,
} from "@/modules/lpo/domain/due-dates";

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
    return { ok: false, message: "LPO file is required." };
  }

  const reviewDueDaysRaw = formData.get("reviewDueDays");
  const deliveryDueDaysRaw = formData.get("deliveryDueDays");

  try {
    await createLpo({
      lpoNumber: readFormString(formData, "lpoNumber"),
      receivedDate: readFormString(formData, "receivedDate"),
      reviewDueDays: Number(reviewDueDaysRaw ?? DEFAULT_REVIEW_DUE_DAYS),
      deliveryDueDays: Number(deliveryDueDaysRaw ?? DEFAULT_DELIVERY_DUE_DAYS),
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
