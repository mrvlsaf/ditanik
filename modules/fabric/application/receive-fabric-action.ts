"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { receiveFabric } from "@/modules/fabric/application/receive-fabric";
import type { ReceiveFabricBatchValues } from "@/modules/fabric/schemas/receive-fabric";

export type ReceiveFabricActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseBatchesFromForm(formData: FormData): ReceiveFabricBatchValues[] {
  const batchesJson = readFormString(formData, "batchesJson");
  if (batchesJson) {
    const parsed: unknown = JSON.parse(batchesJson);
    if (!Array.isArray(parsed)) {
      throw new Error("batchesJson must be a JSON array.");
    }
    return parsed.map((row) => {
      if (!row || typeof row !== "object") {
        throw new Error("Each batch must be an object.");
      }
      const item = row as Record<string, unknown>;
      const qtyRaw = item.qtyReceived;
      const qtyReceived =
        typeof qtyRaw === "number" ? qtyRaw : Number(String(qtyRaw ?? ""));
      return {
        fabricType: String(item.fabricType ?? ""),
        colour: String(item.colour ?? ""),
        remarks:
          item.remarks == null || item.remarks === ""
            ? undefined
            : String(item.remarks),
        qtyReceived,
      };
    });
  }

  const types = formData.getAll("batchType").map(String);
  const colours = formData.getAll("batchColour").map(String);
  const remarks = formData.getAll("batchRemarks").map(String);
  const qtys = formData.getAll("batchQty").map(String);

  const count = Math.max(types.length, colours.length, remarks.length, qtys.length);
  if (count === 0) {
    throw new Error("At least one fabric batch is required.");
  }

  const batches: ReceiveFabricBatchValues[] = [];
  for (let i = 0; i < count; i += 1) {
    batches.push({
      fabricType: types[i] ?? "",
      colour: colours[i] ?? "",
      remarks: remarks[i]?.trim() ? remarks[i] : undefined,
      qtyReceived: Number(qtys[i] ?? ""),
    });
  }
  return batches;
}

export async function receiveFabricAction(
  _previous: ReceiveFabricActionState,
  formData: FormData,
): Promise<ReceiveFabricActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const fileValue = formData.get("invoiceFile");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { ok: false, message: "Supplier invoice PDF is required." };
  }

  try {
    const batches = parseBatchesFromForm(formData);
    await receiveFabric({
      supplierName: readFormString(formData, "supplierName"),
      invoiceRef: readFormString(formData, "invoiceRef"),
      receivedDate: readFormString(formData, "receivedDate"),
      batches,
      invoiceFile: fileValue,
      createdByUserId: session.user.id,
    });

    revalidatePath("/fabric");
    revalidatePath("/invoices");
    return { ok: true, message: "Fabric received." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not receive fabric.";
    return { ok: false, message };
  }
}
