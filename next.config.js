/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { 
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: true,
  },
  // Optimization: Reduce bundle size by modularizing heavy UI imports
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  // Optimization: Compress static assets
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    const backendBase = process.env.API_PROXY_TARGET || 'http://localhost:4000';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
