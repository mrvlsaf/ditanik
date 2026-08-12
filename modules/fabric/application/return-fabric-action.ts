"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { returnFabric } from "@/modules/fabric/application/return-fabric";

export type ReturnFabricActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function returnFabricAction(
  _previous: ReturnFabricActionState,
  formData: FormData,
): Promise<ReturnFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await returnFabric({
      batchId: readFormString(formData, "batchId"),
      manufacturerId: readFormString(formData, "manufacturerId"),
      quantityMeters: Number(readFormString(formData, "quantityMeters")),
      occurredAt: readFormString(formData, "occurredAt"),
      lpoId: readFormString(formData, "lpoId") || undefined,
      note: readFormString(formData, "note") || undefined,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    revalidatePath("/manufacturers");
    revalidatePath(`/manufacturers/${readFormString(formData, "manufacturerId")}`);
    return { ok: true, message: "Fabric returned to stock." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not return fabric.";
    return { ok: false, message };
  }
}
