import { Syne, DM_Sans } from "next/font/google";

import { signInWithGoogle } from "@/app/auth-actions";
import { PandaHero, PandaMark } from "@/components/brand/PandaMark";

const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-login-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-login-body",
});

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
    <div
      className={`${syne.variable} ${dmSans.variable} relative flex min-h-dvh flex-1 overflow-hidden`}
      style={{ fontFamily: "var(--font-login-body), system-ui, sans-serif" }}
    >
      {/* Atmospheric field */}
      <div className="login-bg absolute inset-0" aria-hidden />
      <div className="login-grid absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="login-wash absolute inset-0" aria-hidden />
      <div className="login-orb login-orb-a absolute -top-24 -left-16 h-72 w-72 rounded-full" aria-hidden />
      <div className="login-orb login-orb-b absolute -right-20 bottom-10 h-80 w-80 rounded-full" aria-hidden />

      {/* Large panda watermark — brand visual anchor */}
      <div
        className="pointer-events-none absolute right-[-4%] bottom-[8%] z-[1] opacity-[0.18] sm:right-[4%] sm:bottom-[12%] sm:opacity-[0.28] lg:right-[8%] lg:opacity-40"
        aria-hidden
      >
        <PandaHero className="login-panda h-[min(52vh,28rem)] w-[min(52vh,28rem)]" />
      </div>

      <main className="relative z-10 flex w-full flex-1 flex-col justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <div className="login-fade flex items-center gap-3">
          <PandaMark className="h-9 w-9 shrink-0" title="Ditanik panda" />
          <p
            className="text-xs font-medium tracking-[0.28em] text-[#5c635c] uppercase"
            style={{ fontFamily: "var(--font-login-display), sans-serif" }}
          >
            Internal operations
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-16 sm:py-20">
          <div className="login-rise mb-6 sm:mb-8">
            <PandaMark className="h-16 w-16 sm:h-20 sm:w-20" title="Ditanik" />
          </div>

          <h1
            className="login-rise text-[clamp(3.25rem,12vw,7.5rem)] leading-[0.9] font-extrabold tracking-tight text-[#141414]"
            style={{ fontFamily: "var(--font-login-display), sans-serif" }}
          >
            Ditanik
          </h1>

          <p className="login-fade login-fade-delay mt-6 max-w-md text-lg leading-relaxed text-[#5c635c] sm:text-xl">
            LPO workflows, fabric stock, and manufacturer ledgers — in one calm
            place for your team.
          </p>

          <div className="login-fade login-fade-delay-2 mt-10 w-full max-w-sm">
            {accessDenied ? (
              <p
                className="mb-4 border border-[color-mix(in_srgb,var(--danger)_35%,white)] bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger-hover)]"
                role="alert"
              >
                Access denied. Your Google account is not on the allowlist.
              </p>
            ) : null}

            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="group login-cta flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 border border-[#141414] bg-[#141414] px-5 text-sm font-semibold tracking-wide text-white transition-[transform,background-color] duration-300 hover:bg-[#2a2a2a]"
              >
                <GoogleMark />
                <span>Continue with Google</span>
                <span
                  aria-hidden
                  className="ml-auto text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#7eb089]"
                >
                  →
                </span>
              </button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-[#5c635c]">
              Sign-in is limited to approved Google accounts. No public
              registration.
            </p>
          </div>
        </div>

        <div className="login-fade login-fade-delay-3 flex flex-wrap items-end justify-between gap-4 border-t border-[#141414]/10 pt-6 text-xs text-[#5c635c]">
          <p className="inline-flex items-center gap-2">
            <PandaMark className="h-5 w-5" />
            Fabric · LPO · Invoices · Ledgers
          </p>
          <p className="tracking-wide">Asia / Dubai business day</p>
        </div>
      </main>

      <style>{`
        .login-bg {
          background:
            radial-gradient(70% 55% at 0% 0%, rgba(20, 20, 20, 0.08) 0%, transparent 55%),
            radial-gradient(60% 50% at 100% 0%, rgba(20, 20, 20, 0.07) 0%, transparent 50%),
            radial-gradient(80% 60% at 70% 100%, rgba(31, 138, 76, 0.14) 0%, transparent 55%),
            linear-gradient(165deg, #f7f7f5 0%, #f0f1ee 45%, #e6e8e2 100%);
        }

        .login-grid {
          background-image:
            linear-gradient(to right, rgba(31, 138, 76, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(31, 138, 76, 0.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 70% at 40% 40%, #000 20%, transparent 75%);
        }

        .login-wash {
          background:
            linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.55) 50%, transparent 65%);
          background-size: 220% 100%;
          animation: login-sheen 14s ease-in-out infinite;
        }

        .login-orb {
          filter: blur(40px);
          opacity: 0.55;
          animation: login-drift 18s ease-in-out infinite;
        }

        .login-orb-a {
          background: radial-gradient(circle, rgba(30, 30, 30, 0.28) 0%, transparent 70%);
        }

        .login-orb-b {
          background: radial-gradient(circle, rgba(31, 138, 76, 0.32) 0%, transparent 70%);
          animation-delay: -7s;
          animation-duration: 22s;
        }

        .login-fade {
          opacity: 0;
          animation: login-fade-in 0.9s ease forwards;
        }

        .login-fade-delay {
          animation-delay: 0.15s;
        }

        .login-fade-delay-2 {
          animation-delay: 0.3s;
        }

        .login-fade-delay-3 {
          animation-delay: 0.45s;
        }

        .login-rise {
          opacity: 0;
          transform: translateY(18px);
          animation: login-rise-in 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .login-cta:active {
          transform: translateY(1px);
        }

        @keyframes login-fade-in {
          to { opacity: 1; }
        }

        @keyframes login-rise-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes login-sheen {
          0%, 100% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
        }

        @keyframes login-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(18px, -12px) scale(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-wash,
          .login-orb,
          .login-fade,
          .login-rise,
          .login-panda {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        .login-panda {
          animation: login-drift 22s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
