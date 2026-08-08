"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { createFabricEntry } from "@/modules/fabric/application/create-fabric-entry";

export type CreateFabricEntryActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createFabricEntryAction(
  _previous: CreateFabricEntryActionState,
  formData: FormData,
): Promise<CreateFabricEntryActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fileValue = formData.get("invoiceFile");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { ok: false, message: "Invoice PDF is required." };
  }

  try {
    await createFabricEntry({
      vendor: readFormString(formData, "vendor"),
      color: readFormString(formData, "color"),
      metersReceived: Number(formData.get("metersReceived")),
      metersDelivered: Number(formData.get("metersDelivered")),
      destination: readFormString(formData, "destination"),
      invoiceFile: fileValue,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    revalidatePath("/invoices");
    return { ok: true, message: "Fabric entry created." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not create fabric entry.";
    return { ok: false, message };
  }
}
