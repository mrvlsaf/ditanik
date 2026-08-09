"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { createManufacturer } from "@/modules/manufacturer/application/manufacturers";

export type CreateManufacturerActionState = {
  ok: boolean;
  message: string | null;
};

export async function createManufacturerAction(
  _previous: CreateManufacturerActionState,
  formData: FormData,
): Promise<CreateManufacturerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const name = formData.get("name");
  if (typeof name !== "string") {
    return { ok: false, message: "Name is required." };
  }

  try {
    await createManufacturer({
      name,
      createdByUserId: session.user.id,
    });
    revalidatePath("/manufacturers");
    revalidatePath("/lpo");
    return { ok: true, message: "Manufacturer created." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not create manufacturer.";
    return { ok: false, message };
  }
}
