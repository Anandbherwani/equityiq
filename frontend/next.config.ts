import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/sectors", destination: "/themes", permanent: false },
      { source: "/track-record", destination: "/validation", permanent: false },
      { source: "/performance", destination: "/backtest", permanent: false },
      { source: "/system-health", destination: "/health", permanent: false },
    ];
  },
};

export default nextConfig;
