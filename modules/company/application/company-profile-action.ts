"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { upsertCompanyProfile } from "@/modules/company/application/company-profile";

export type CompanyProfileActionState = {
  ok: boolean;
  message: string | null;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = readFormString(formData, key).trim();
  return value ? value : undefined;
}

export async function saveCompanyProfileAction(
  _previous: CompanyProfileActionState,
  formData: FormData,
): Promise<CompanyProfileActionState> {
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

  try {
    await upsertCompanyProfile({
      legalName: readFormString(formData, "legalName"),
      trn: readOptionalFormString(formData, "trn"),
      addressLine1: readOptionalFormString(formData, "addressLine1"),
      addressLine2: readOptionalFormString(formData, "addressLine2"),
      phone: readOptionalFormString(formData, "phone"),
      email: readOptionalFormString(formData, "email"),
      website: readOptionalFormString(formData, "website"),
      bankName: readOptionalFormString(formData, "bankName"),
      bankAccountName: readOptionalFormString(formData, "bankAccountName"),
      bankAccountNumber: readOptionalFormString(formData, "bankAccountNumber"),
      bankIban: readOptionalFormString(formData, "bankIban"),
      bankSwiftCode: readOptionalFormString(formData, "bankSwiftCode"),
      defaultTermsText: readOptionalFormString(formData, "defaultTermsText"),
      defaultFooterText: readOptionalFormString(formData, "defaultFooterText"),
      updatedByUserId: dbUser.id,
    });

    revalidatePath("/settings/company");
    return { ok: true, message: "Company profile saved." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not save company profile.";
    return { ok: false, message };
  }
}
