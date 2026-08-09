"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createRate,
  deactivateRate,
} from "@/modules/fabric/application/consumption";

export type ConsumptionActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createConsumptionRateAction(
  _previous: ConsumptionActionState,
  formData: FormData,
): Promise<ConsumptionActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await createRate({
      garmentName: readFormString(formData, "garmentName"),
      metersPerUnit: Number(readFormString(formData, "metersPerUnit")),
    });
    revalidatePath("/fabric");
    revalidatePath("/consumption");
    revalidatePath("/lpo");
    return { ok: true, message: "Consumption rate created." };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create consumption rate.";
    return { ok: false, message };
  }
}

export async function deactivateConsumptionRateAction(
  rateId: string,
): Promise<ConsumptionActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deactivateRate(rateId);
    revalidatePath("/fabric");
    revalidatePath("/consumption");
    revalidatePath("/lpo");
    return { ok: true, message: "Consumption rate deactivated." };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not deactivate consumption rate.";
    return { ok: false, message };
  }
}
