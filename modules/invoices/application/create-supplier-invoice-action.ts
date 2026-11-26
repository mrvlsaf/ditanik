"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { readPdfUploadFromForm } from "@/modules/files/application/store-pdf";
import { createSupplierInvoice } from "@/modules/invoices/application/create-supplier-invoice";
import { parseSupplierInvoiceType } from "@/modules/invoices/domain/invoice-types";
import { readFormString } from "@/lib/form-data";

export type CreateSupplierInvoiceActionState = {
  ok: boolean;
  message: string | null;
};

function parseLines(formData: FormData) {
  const json = readFormString(formData, "linesJson");
  if (!json) {
    throw new Error("Add at least one invoice line.");
  }
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("Invoice lines must be a list.");
  }
  return parsed.map((row) => {
    const item = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const asNumber = (value: unknown) =>
      typeof value === "number" ? value : Number(String(value ?? ""));
    return {
      description: String(item.description ?? ""),
      quantity: asNumber(item.quantity),
      unitPrice: asNumber(item.unitPrice),
      vatPercent: asNumber(item.vatPercent),
    };
  });
}

export async function createSupplierInvoiceAction(
  _previous: CreateSupplierInvoiceActionState,
  formData: FormData,
): Promise<CreateSupplierInvoiceActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You must be signed in." };
  }

  const type = parseSupplierInvoiceType(readFormString(formData, "type"));
  if (!type) {
    return { ok: false, message: "Choose the kind of invoice first." };
  }

  // The PDF is required: it is the supplier's original, kept for VAT records.
  const file = readPdfUploadFromForm(formData, "invoiceFile", "invoiceFileRef");
  if (!file) {
    return { ok: false, message: "The invoice PDF is required." };
  }

  try {
    await createSupplierInvoice({
      type,
      supplierName: readFormString(formData, "supplierName"),
      invoiceRef: readFormString(formData, "invoiceRef"),
      receivedDate: readFormString(formData, "receivedDate"),
      lines: parseLines(formData),
      file,
      createdByUserId: session.user.id,
    });

    revalidatePath("/invoices");
    return { ok: true, message: "Invoice saved." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not save the invoice.";
    return { ok: false, message };
  }
}
