"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { assignManufacturerToLpo } from "@/modules/lpo/application/assign-manufacturer";
import { readPdfUploadFromForm } from "@/modules/files/application/store-pdf";
import { markClientDeliveryCompleted } from "@/modules/lpo/application/mark-client-delivery";

export type LpoMutationActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function assignManufacturerAction(
  lpoId: string,
  _previous: LpoMutationActionState,
  formData: FormData,
): Promise<LpoMutationActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fileValue = readPdfUploadFromForm(
    formData,
    "productionFile",
    "productionFileRef",
  );
  if (!fileValue) {
    return { ok: false, message: "Production file PDF is required." };
  }

  const manufacturerId = readFormString(formData, "manufacturerId");
  const newManufacturerName = readFormString(formData, "newManufacturerName");

  try {
    await assignManufacturerToLpo({
      lpoId,
      manufacturerId: manufacturerId || undefined,
      newManufacturerName: newManufacturerName || undefined,
      productionFile: fileValue,
      actorUserId: session.user.id,
    });

    revalidatePath("/lpo");
    revalidatePath(`/lpo/${lpoId}`);
    revalidatePath("/manufacturers");
    return { ok: true, message: "Manufacturer assigned." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not assign manufacturer.";
    return { ok: false, message };
  }
}

export async function markClientDeliveryCompletedAction(
  lpoId: string,
): Promise<LpoMutationActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await markClientDeliveryCompleted({
      lpoId,
      actorUserId: session.user.id,
    });

    revalidatePath("/lpo");
    revalidatePath(`/lpo/${lpoId}`);
    return { ok: true, message: "Client delivery marked completed." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not complete client delivery.";
    return { ok: false, message };
  }
}
