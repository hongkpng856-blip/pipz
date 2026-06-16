import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/pipz',
  transpilePackages: ['@pipz/core'],
  images: { unoptimized: true },
}

export default nextConfig
