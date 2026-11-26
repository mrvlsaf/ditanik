"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteSupplierInvoice } from "@/modules/invoices/application/delete-supplier-invoice";

export async function deleteSupplierInvoiceAction(
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  try {
    await deleteSupplierInvoice({ invoiceId, actorUserId: session.user.id });
    revalidatePath("/invoices");
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not delete the invoice.";
    return { ok: false, message };
  }
}
