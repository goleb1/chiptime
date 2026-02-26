import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    // Default is 1MB — too small for athlete photos uploaded from phones.
    // Raised to 5MB to match the Supabase Storage per-file limit set on the
    // athlete-photos bucket.
    bodySizeLimit: "5mb",
  },
};

export default nextConfig;
