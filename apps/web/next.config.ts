import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@pipz/core'],
  images: { unoptimized: true },
}

export default nextConfig
