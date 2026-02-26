import type { NextConfig } from "next";

// `serverActions` is a stable Next.js 15+ top-level option, but the TypeScript
// types bundled with Next.js 16.1.6 don't declare it on NextConfig yet.
// The type assertion lets TypeScript compile while preserving the runtime value.
const nextConfig = {
  serverActions: {
    // Default body size is 1 MB — too small for phone photos (often 2–8 MB).
    bodySizeLimit: "5mb",
  },
} as NextConfig;

export default nextConfig;
