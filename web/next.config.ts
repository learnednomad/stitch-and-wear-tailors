import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // PocketBase serves user-uploaded files; skip the Next image optimizer.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "api.stitchandwear.learnednomad.com" },
      { protocol: "http", hostname: "127.0.0.1", port: "8090" },
    ],
  },
};

export default nextConfig;
