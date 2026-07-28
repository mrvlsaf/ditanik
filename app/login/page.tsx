import { PageContainer } from "@/components/app-shell/PageContainer";

import { signInWithGoogle } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string }>;
}>) {
  const params = await searchParams;
  const accessDenied =
    params.error === "AccessDenied" || params.error === "Configuration";

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center bg-zinc-50 px-4 py-12">
      <PageContainer title="Sign in" description="Ditanik admin access via Google.">
        <div className="mx-auto w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          {accessDenied ? (
            <p
              className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              Access denied. Your Google account is not on the allowlist.
            </p>
          ) : null}

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Continue with Google
            </button>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}
