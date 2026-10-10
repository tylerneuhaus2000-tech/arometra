import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  distDir: process.env.AROMETRA_NEXT_DIST_DIR || '.next',
};

export default nextConfig;
