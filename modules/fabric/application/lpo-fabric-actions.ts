"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  addRequirement,
  deleteRequirement,
} from "@/modules/fabric/application/lpo-fabric-requirements";
import { recordUsage } from "@/modules/fabric/application/record-usage";

export type LpoFabricActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

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

export async function recordFabricUsageAction(
  _previous: LpoFabricActionState,
  formData: FormData,
): Promise<LpoFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const lpoId = readFormString(formData, "lpoId");

  try {
    await recordUsage({
      batchId: readFormString(formData, "batchId"),
      manufacturerId: readFormString(formData, "manufacturerId"),
      lpoId,
      quantityMeters: Number(readFormString(formData, "quantityMeters")),
      occurredAt: readFormString(formData, "occurredAt"),
      note: readFormString(formData, "note") || undefined,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    revalidatePath("/manufacturers");
    if (lpoId) {
      revalidatePath(`/lpo/${lpoId}`);
    }
    return { ok: true, message: "Fabric usage recorded." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not record fabric usage.";
    return { ok: false, message };
  }
}
