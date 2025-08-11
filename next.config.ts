import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf2json"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    // Exclude ai-chatbot directory from build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/ai-chatbot/**", "**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
