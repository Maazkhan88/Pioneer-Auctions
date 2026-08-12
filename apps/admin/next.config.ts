import type { NextConfig } from "next";

const isCloudflare =
  process.env.CLOUDFLARE_PAGES === "true" || process.env.CF_PAGES === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pioneer/design-tokens"],
  ...(isCloudflare
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
