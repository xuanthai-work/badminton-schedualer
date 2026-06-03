import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bake the deploy's commit SHA into the client bundle so it can detect when a
  // newer version has been deployed (see /api/version + UpdatePrompt).
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
