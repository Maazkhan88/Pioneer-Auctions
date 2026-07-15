import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pioneer/design-tokens"],
  ...(isGitHubPages
    ? {
        assetPrefix: "/Pioneer-Auctions",
        basePath: "/Pioneer-Auctions",
        output: "export",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
