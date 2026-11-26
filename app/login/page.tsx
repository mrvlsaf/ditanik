import { signInWithGoogle } from "@/app/auth-actions";
import { PandaHero, PandaMark } from "@/components/brand/PandaMark";

const HIGHLIGHTS = [
  "See what needs action every morning",
  "Know where every metre of fabric is",
  "Create documents in a few clicks",
] as const;

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string }>;
}>) {
  const params = await searchParams;
  const accessDenied =
    params.error === "AccessDenied" || params.error === "Configuration";

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-[#f3f4f2] lg:flex-row">
      {/* Sign-in comes first on phones; the brand panel follows below. */}
      <main className="order-1 flex flex-1 items-center justify-center px-6 py-10 lg:order-2 lg:py-12">
        <div className="flex w-full max-w-100 flex-col gap-5 rounded-2xl border border-[#d8dbd4] bg-white p-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <PandaMark className="h-9 w-9 shrink-0" />
            <p className="text-xl font-bold tracking-tight">Ditanik</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm leading-normal text-[#4d544d]">
              Use the Google account your administrator approved.
            </p>
          </div>

          {accessDenied ? (
            <p
              className="rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_35%,white)] bg-(--danger-muted) px-3.5 py-3 text-sm leading-normal text-(--danger-hover)"
              role="alert"
            >
              Access denied. Your Google account is not on the approved list. Try again,
              or ask your administrator to add it.
            </p>
          ) : null}

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-[#8b928b] bg-white px-4.5 text-[15px] font-semibold text-[#1a1a1a] transition-colors hover:bg-[#f7f7f5]"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>

          <p className="rounded-[10px] bg-[#f3f4f2] px-3.5 py-3 text-[13px] leading-normal text-[#4d544d]">
            Not able to sign in? Only approved email addresses can enter. Ask your
            administrator to add yours.
          </p>
        </div>
      </main>

      <aside
        className="order-2 flex flex-col justify-between gap-10 bg-[#141414] px-8 py-10 text-[#f4f4f4] sm:px-14 sm:py-14 lg:order-1 lg:flex-1"
        aria-label="About Ditanik"
      >
        <div className="hidden items-center gap-2.5 lg:flex">
          <PandaMark className="h-9 w-9 shrink-0" />
          <p className="text-xl font-bold tracking-tight">Ditanik</p>
        </div>

        <div className="flex max-w-130 flex-col gap-5">
          {/* The panda sits on a pale disc so its dark ears and eye patches
              stay visible against the dark panel. */}
          <div
            aria-hidden
            className="flex h-40 w-40 items-center justify-center rounded-full bg-[#e4efe6] sm:h-48 sm:w-48"
          >
            <PandaHero className="h-32 w-32 sm:h-40 sm:w-40" />
          </div>
          <p className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-semibold tracking-tight">
            From customer order to delivery, in one place.
          </p>
          <p className="text-base leading-relaxed text-[#c9cdc8]">
            Track LPOs, manage fabric stock and manufacturer ledgers, and create
            quotations, invoices and delivery notes.
          </p>
          <ul className="flex flex-col gap-3 text-[15px] text-[#e9ebe8]">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full bg-[#7eb089]"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-[#a3a8a2]">
          Dates follow the Asia / Dubai business day.
        </p>
      </aside>
    </div>
  );
}
