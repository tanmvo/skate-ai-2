import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf2json"],
  async rewrites() {
    return [
      {
        source: '/analytics-proxy/:path*',
        destination: 'https://us.i.posthog.com/:path*'
      }
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
