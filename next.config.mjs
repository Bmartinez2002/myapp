/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [] },
  experimental: {
    optimizePackageImports: ["framer-motion", "date-fns", "date-fns-tz"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};
export default nextConfig;
