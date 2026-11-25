"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createLpo } from "@/modules/lpo/application/create-lpo";
import { readPdfUploadFromForm } from "@/modules/files/application/store-pdf";
import type { LpoLineItemValues } from "@/modules/lpo/schemas/line-items";

export type CreateLpoActionState = {
  ok: boolean;
  message: string | null;
  /** Set when the LPO was created, so the form can open it. */
  lpoId?: string;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = readFormString(formData, key).trim();
  return value ? value : undefined;
}

function parseLineItemsFromForm(formData: FormData): LpoLineItemValues[] {
  const lineItemsJson = readFormString(formData, "lineItemsJson");
  if (!lineItemsJson) {
    throw new Error("At least one line item is required.");
  }

  const parsed: unknown = JSON.parse(lineItemsJson);
  if (!Array.isArray(parsed)) {
    throw new Error("lineItemsJson must be a JSON array.");
  }

  return parsed.map((row) => {
    if (!row || typeof row !== "object") {
      throw new Error("Each line item must be an object.");
    }
    const item = row as Record<string, unknown>;

    const quantityRaw = item.quantity;
    const quantity =
      typeof quantityRaw === "number" ? quantityRaw : Number(String(quantityRaw ?? ""));

    const unitPriceRaw = item.unitPrice;
    const unitPrice =
      typeof unitPriceRaw === "number"
        ? unitPriceRaw
        : Number(String(unitPriceRaw ?? ""));

    const discountRaw = item.discountPercent;
    const discountPercent =
      discountRaw == null || discountRaw === ""
        ? undefined
        : typeof discountRaw === "number"
          ? discountRaw
          : Number(String(discountRaw));

    return {
      category:
        item.category == null || item.category === "" ? undefined : String(item.category),
      description: String(item.description ?? ""),
      articleNo:
        item.articleNo == null || item.articleNo === ""
          ? undefined
          : String(item.articleNo),
      quantity,
      unitPrice,
      discountPercent,
    };
  });
}

export async function createLpoAction(
  _previous: CreateLpoActionState,
  formData: FormData,
): Promise<CreateLpoActionState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: "You must be signed in." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) {
    return {
      ok: false,
      message: "User record not found. Sign out and sign in again.",
    };
  }

  const isUrgent = readFormString(formData, "isUrgent") === "on";
  const fileValue = readPdfUploadFromForm(formData, "file", "fileRef");
  // The customer's PDF is only optional for an urgent LPO.
  if (!fileValue && !isUrgent) {
    return { ok: false, message: "LPO document PDF is required." };
  }

  try {
    const lineItems = parseLineItemsFromForm(formData);

    const created = await createLpo({
      lpoNumber: readFormString(formData, "lpoNumber"),
      nickname: readFormString(formData, "nickname"),
      clientName: readFormString(formData, "clientName"),
      receivedDate: readFormString(formData, "receivedDate"),
      clientSubEntityName: readOptionalFormString(formData, "clientSubEntityName"),
      clientTrn: readOptionalFormString(formData, "clientTrn"),
      invoiceAddress: readFormString(formData, "invoiceAddress"),
      deliveryAddress: readOptionalFormString(formData, "deliveryAddress"),
      siteCode: readFormString(formData, "siteCode"),
      paymentTerms: readOptionalFormString(formData, "paymentTerms"),
      deliveryTerms: readOptionalFormString(formData, "deliveryTerms"),
      currency: readOptionalFormString(formData, "currency"),
      lineItems,
      file: fileValue,
      isUrgent,
      createdByUserId: dbUser.id,
    });

    revalidatePath("/lpo");
    return {
      ok: true,
      message: isUrgent ? `Urgent LPO created as ${created.lpoNumber}.` : "LPO created.",
      lpoId: created.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not create LPO.";
    return { ok: false, message };
  }
}
