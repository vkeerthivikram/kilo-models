import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(process.env.NODE_ENV !== "production" && process.env.KILO_MODELS_E2E === "1" ? { distDir: ".next-e2e" } : {}),
};

export default nextConfig;
