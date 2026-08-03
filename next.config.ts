import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["mac-mini.sgponte", "test.cylll.party"],
};

export default nextConfig;
