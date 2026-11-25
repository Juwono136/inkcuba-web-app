import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
    "pg",
    "pino",
    "pino-pretty",
    "nodemailer",
    "ioredis",
    // Keep BullMQ (and its optional Valkey peer) out of the webpack graph so
    // student/lecturer API compiles do not warn on `@valkey/valkey-glide`.
    "bullmq",
    // Keep binary path packages outside the webpack bundle (__dirname must stay real).
    "ffmpeg-static",
    "ffprobe-static",
    "sharp",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default nextConfig;
