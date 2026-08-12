"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  deleteFabricBatch,
  deleteFabricInvoice,
} from "@/modules/fabric/application/delete-fabric";

export async function deleteFabricInvoiceAction(
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteFabricInvoice({
      invoiceId,
      actorUserId: session.user.id,
    });
    revalidatePath("/fabric");
    revalidatePath("/invoices");
    revalidatePath("/manufacturers");
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete fabric invoice.";
    return { ok: false, message };
  }
}

export async function deleteFabricBatchAction(
  batchId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteFabricBatch({
      batchId,
      actorUserId: session.user.id,
    });
    revalidatePath("/fabric");
    revalidatePath("/invoices");
    revalidatePath("/manufacturers");
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete fabric batch.";
    return { ok: false, message };
  }
}
