import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Match modules/files/domain/pdf-rules.ts (25MB PDF uploads via Server Actions).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Ship the real Deezano .xlsx templates (modules/documents/infrastructure/*)
  // inside the Vercel serverless function bundle — without this they're only
  // present in local dev, not in the deployed function's file system.
  outputFileTracingIncludes: {
    "/**": ["./templates/documents/*.xlsx"],
  },
};

export default nextConfig;
