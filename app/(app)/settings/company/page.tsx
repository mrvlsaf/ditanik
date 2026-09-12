import { PageContainer } from "@/components/app-shell/PageContainer";
import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { getCompanyProfile } from "@/modules/company/application/company-profile";

export default async function CompanyProfilePage() {
  const profile = await getCompanyProfile();

  const defaults = {
    legalName: profile?.legalName ?? "",
    trn: profile?.trn ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    bankName: profile?.bankName ?? "",
    bankAccountName: profile?.bankAccountName ?? "",
    bankAccountNumber: profile?.bankAccountNumber ?? "",
    bankIban: profile?.bankIban ?? "",
    bankSwiftCode: profile?.bankSwiftCode ?? "",
    defaultTermsText: profile?.defaultTermsText ?? "",
    defaultFooterText: profile?.defaultFooterText ?? "",
  };

  return (
    <PageContainer
      title="Company profile"
      description="Deezano's own letterhead and bank details, reused on every generated Quotation, Quote, Invoice and Delivery Note."
    >
      <CompanyProfileForm defaults={defaults} />
    </PageContainer>
  );
}
