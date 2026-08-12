"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { issueFabric } from "@/modules/fabric/application/issue-fabric";

export type IssueFabricActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function issueFabricAction(
  _previous: IssueFabricActionState,
  formData: FormData,
): Promise<IssueFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await issueFabric({
      batchId: readFormString(formData, "batchId"),
      manufacturerId: readFormString(formData, "manufacturerId"),
      quantityMeters: Number(readFormString(formData, "quantityMeters")),
      occurredAt: readFormString(formData, "occurredAt"),
      transportRef: readFormString(formData, "transportRef") || undefined,
      lpoId: readFormString(formData, "lpoId") || undefined,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    const manufacturerId = readFormString(formData, "manufacturerId");
    if (manufacturerId) {
      revalidatePath("/manufacturers");
      revalidatePath(`/manufacturers/${manufacturerId}`);
    }
    const lpoId = readFormString(formData, "lpoId");
    if (lpoId) {
      revalidatePath(`/lpo/${lpoId}`);
    }
    return { ok: true, message: "Fabric issued to manufacturer." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not issue fabric.";
    return { ok: false, message };
  }
}
