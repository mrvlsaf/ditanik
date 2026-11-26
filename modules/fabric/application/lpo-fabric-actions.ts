"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  addRequirement,
  deleteRequirement,
} from "@/modules/fabric/application/lpo-fabric-requirements";
import { readFormString } from "@/lib/form-data";

export type LpoFabricActionState = {
  ok: boolean;
  message: string | null;
};

export async function addLpoFabricRequirementAction(
  lpoId: string,
  _previous: LpoFabricActionState,
  formData: FormData,
): Promise<LpoFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const consumptionRateId = readFormString(formData, "consumptionRateId");
  const garmentName = readFormString(formData, "garmentName");
  const metersPerUnitRaw = readFormString(formData, "metersPerUnit");

  try {
    await addRequirement({
      lpoId: readFormString(formData, "lpoId") || lpoId,
      consumptionRateId: consumptionRateId || undefined,
      garmentName: garmentName || undefined,
      metersPerUnit: metersPerUnitRaw
        ? Number(metersPerUnitRaw)
        : undefined,
      quantity: Number(readFormString(formData, "quantity")),
      actorUserId: session.user.id,
    });

    revalidatePath("/lpo");
    revalidatePath(`/lpo/${lpoId}`);
    revalidatePath("/fabric");
    revalidatePath("/manufacturers");
    return { ok: true, message: "Fabric requirement added." };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not add fabric requirement.";
    return { ok: false, message };
  }
}

export async function deleteLpoFabricRequirementAction(
  requirementId: string,
  lpoId: string,
): Promise<LpoFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteRequirement(requirementId, session.user.id);
    revalidatePath("/lpo");
    revalidatePath(`/lpo/${lpoId}`);
    revalidatePath("/fabric");
    revalidatePath("/manufacturers");
    return { ok: true, message: "Fabric requirement removed." };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not remove fabric requirement.";
    return { ok: false, message };
  }
}
