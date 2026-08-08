"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { changeLpoDueDate } from "@/modules/lpo/application/change-lpo-due-date";

export type ChangeLpoDueDateActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function changeLpoDueDateAction(
  lpoId: string,
  _previous: ChangeLpoDueDateActionState,
  formData: FormData,
): Promise<ChangeLpoDueDateActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fieldRaw = readFormString(formData, "field");
  if (fieldRaw !== "REVIEW" && fieldRaw !== "DELIVERY") {
    return { ok: false, message: "Choose review or delivery due date." };
  }

  try {
    await changeLpoDueDate({
      lpoId,
      field: fieldRaw,
      newDueDate: readFormString(formData, "newDueDate"),
      justification: readFormString(formData, "justification"),
      changedByUserId: session.user.id,
    });

    revalidatePath(`/lpo/${lpoId}`);
    revalidatePath("/lpo");
    return { ok: true, message: "Due date updated." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not update due date.";
    return { ok: false, message };
  }
}
