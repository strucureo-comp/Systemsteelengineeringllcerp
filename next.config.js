/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true,
  },
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
