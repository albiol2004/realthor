const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/realthor',
  assetPrefix: '/realthor',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
}

module.exports = nextConfig
