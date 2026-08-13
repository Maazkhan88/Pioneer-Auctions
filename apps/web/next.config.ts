import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isCloudflare =
  process.env.CLOUDFLARE_PAGES === "true" || process.env.CF_PAGES === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pioneer/contracts", "@pioneer/design-tokens"],
  ...(isGitHubPages || isCloudflare
    ? {
        ...(isGitHubPages
          ? {
              assetPrefix: "/Pioneer-Auctions",
              basePath: "/Pioneer-Auctions",
            }
          : {}),
        output: "export",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
