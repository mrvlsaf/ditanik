import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  outputFileTracingIncludes: {
    "/**": [
      "./templates/documents/*.xlsx",
      // pdfjs-dist's Node build loads its "worker" via a dynamically computed
      // path (a fake in-process worker, since real Worker threads don't
      // exist server-side) rather than a plain import, so Next's file
      // tracer can't see it's needed and prunes it from the deployed
      // function by default — breaking PDF prefill only on Vercel, never
      // in local dev where the full package is always on disk.
      //
      // This must go through pnpm's real ".pnpm" store path, not the
      // top-level "node_modules/pdfjs-dist" symlink pnpm creates — Vercel's
      // packaging step rejects any serverless function whose files were
      // reached via a symlinked directory ("invalid deployment package").
      // The "*" wildcards the version segment so a future patch/minor bump
      // of the ^6.3.289-ranged dependency doesn't silently break this.
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/*.mjs",
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});