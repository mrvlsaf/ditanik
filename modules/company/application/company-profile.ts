import { prisma } from "@/lib/db";
import {
  companyProfileSchema,
  type CompanyProfileValues,
} from "@/modules/company/schemas/company-profile";

/**
 * CompanyProfile is a singleton settings row — there is exactly one, and it
 * always lives at this fixed id (no auto-generated id, so app code owns it).
 */
export const COMPANY_PROFILE_ID = "singleton";

export async function getCompanyProfile() {
  return prisma.companyProfile.findUnique({
    where: { id: COMPANY_PROFILE_ID },
  });
}

export type UpsertCompanyProfileInput = CompanyProfileValues & {
  updatedByUserId: string;
};

export async function upsertCompanyProfile(input: UpsertCompanyProfileInput) {
  const values = companyProfileSchema.parse({
    legalName: input.legalName,
    trn: input.trn,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    phone: input.phone,
    email: input.email,
    website: input.website,
    bankName: input.bankName,
    bankAccountName: input.bankAccountName,
    bankAccountNumber: input.bankAccountNumber,
    bankIban: input.bankIban,
    bankSwiftCode: input.bankSwiftCode,
    defaultTermsText: input.defaultTermsText,
    defaultFooterText: input.defaultFooterText,
  });

  const data = {
    legalName: values.legalName,
    trn: values.trn?.trim() || null,
    addressLine1: values.addressLine1?.trim() || null,
    addressLine2: values.addressLine2?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    website: values.website?.trim() || null,
    bankName: values.bankName?.trim() || null,
    bankAccountName: values.bankAccountName?.trim() || null,
    bankAccountNumber: values.bankAccountNumber?.trim() || null,
    bankIban: values.bankIban?.trim() || null,
    bankSwiftCode: values.bankSwiftCode?.trim() || null,
    defaultTermsText: values.defaultTermsText?.trim() || null,
    defaultFooterText: values.defaultFooterText?.trim() || null,
    updatedById: input.updatedByUserId,
  };

  return prisma.companyProfile.upsert({
    where: { id: COMPANY_PROFILE_ID },
    create: { id: COMPANY_PROFILE_ID, ...data },
    update: data,
  });
}
