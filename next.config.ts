import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pachetul local din packages/ e livrat ca sursa TypeScript.
  transpilePackages: ["orval-data-handler"],
};

export default nextConfig;
