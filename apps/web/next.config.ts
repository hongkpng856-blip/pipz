import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/pipz',
  transpilePackages: ['@pipz/core'],
}

export default nextConfig
