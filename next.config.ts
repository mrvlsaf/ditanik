import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Match modules/files/domain/pdf-rules.ts (25MB PDF uploads via Server Actions).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
