import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // 👇 force webpack instead of turbopack
  experimental: {
    turbo: false,
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.ttf$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
