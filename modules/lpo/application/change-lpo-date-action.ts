"use server";

import { LpoDateField } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { changeLpoDate } from "@/modules/lpo/application/change-lpo-date";

export type ChangeLpoDateActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function changeLpoDateAction(
  lpoId: string,
  _previous: ChangeLpoDateActionState,
  formData: FormData,
): Promise<ChangeLpoDateActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fieldRaw = readFormString(formData, "field");
  if (
    fieldRaw !== LpoDateField.ASSIGNMENT &&
    fieldRaw !== LpoDateField.PRODUCTION_DEADLINE &&
    fieldRaw !== LpoDateField.CLIENT_DELIVERY
  ) {
    return { ok: false, message: "Invalid date field." };
  }

  try {
    await changeLpoDate({
      lpoId,
      field: fieldRaw,
      newDate: readFormString(formData, "newDate"),
      reason: readFormString(formData, "reason") || undefined,
      changedByUserId: session.user.id,
    });

    revalidatePath("/lpo");
    revalidatePath(`/lpo/${lpoId}`);
    return { ok: true, message: "Date updated." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not update date.";
    return { ok: false, message };
  }
}
