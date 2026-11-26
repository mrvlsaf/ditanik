import { getCompanyProfile } from "@/modules/company/application/company-profile";

export const WORKSPACE_FALLBACK_NAME = "Ditanik";

async function loadWorkspaceName(): Promise<string> {
  try {
    const profile = await getCompanyProfile();
    return profile?.legalName?.trim() || WORKSPACE_FALLBACK_NAME;
  } catch {
    // The top bar must never break the page because the database is asleep.
    return WORKSPACE_FALLBACK_NAME;
  }
}

/** The company name shown in the top bar. */
export async function WorkspaceName() {
  return <>{await loadWorkspaceName()}</>;
}
