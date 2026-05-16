/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { 
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
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

