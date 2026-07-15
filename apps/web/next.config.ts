import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pioneer/design-tokens"],
};

export default nextConfig;
