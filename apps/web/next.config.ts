import type { NextConfig } from 'next';

/**
 * NOVA web client.
 *
 * `transpilePackages` lets the workspace contract package be consumed directly,
 * and the rewrite makes a split deployment (web on one host, API on another)
 * optional: set `API_PROXY_TARGET` and the browser talks to a same-origin
 * `/api/v1/*`, which keeps the auth cookies first-party.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@nova/shared'],

  eslint: { ignoreDuringBuilds: true },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.gravatar.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },

  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [
      { source: '/api/v1/:path*', destination: `${target.replace(/\/$/, '')}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
