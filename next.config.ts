import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["img.clerk.com"], // Add other domains if needed
  },
};

export default nextConfig;
