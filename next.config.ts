import withPWA from "next-pwa";
import type { NextConfig } from "next";
import type { PWAConfig } from "next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  reactStrictMode: true,
  trailingSlash: true, // Important for Vercel
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

const pwaOptions = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
};

export default withPWA(pwaOptions)(nextConfig as PWAConfig);
