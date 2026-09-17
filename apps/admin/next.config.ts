import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ninecrate/data-store", "@ninecrate/types"],
};

export default nextConfig;
