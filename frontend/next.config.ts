import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true // Required for static export
  },
  // Ensure trailing slashes for better S3 compatibility
  trailingSlash: true
};

export default nextConfig;
