/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hides the floating "N" Next.js dev tools badge that otherwise sits in
  // the bottom-left corner of every page during `next dev`.
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "dd.dexscreener.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
    ],
  },
};

module.exports = nextConfig;
