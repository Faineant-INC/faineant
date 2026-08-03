/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@faineant/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudflare.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
