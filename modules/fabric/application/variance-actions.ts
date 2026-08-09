"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { createVariance } from "@/modules/fabric/application/variance";

export type VarianceActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createVarianceAction(
  _previous: VarianceActionState,
  formData: FormData,
): Promise<VarianceActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const lpoId = readFormString(formData, "lpoId");

  try {
    await createVariance({
      expectedMeters: Number(readFormString(formData, "expectedMeters")),
      actualMeters: Number(readFormString(formData, "actualMeters")),
      reason: readFormString(formData, "reason"),
      batchId: readFormString(formData, "batchId") || undefined,
      manufacturerId: readFormString(formData, "manufacturerId") || undefined,
      lpoId: lpoId || undefined,
      note: readFormString(formData, "note") || undefined,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    revalidatePath("/manufacturers");
    if (lpoId) {
      revalidatePath(`/lpo/${lpoId}`);
    }
    return { ok: true, message: "Variance recorded." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not record variance.";
    return { ok: false, message };
  }
}
